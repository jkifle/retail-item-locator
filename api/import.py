# api/import.py
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import psycopg2.extras

app = Flask(__name__)
CORS(app)

DATABASE_URL = os.environ.get("DATABASE_URL")

def get_db_connection():
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL not set")
    return psycopg2.connect(DATABASE_URL)

def empty_to_none(value):
    if value is None:
        return None
    s = str(value).strip()
    return s if s else None

@app.route("/", methods=["POST"])
def handler():
    payload_data = request.get_json()
    
    if isinstance(payload_data, dict):
        payloads = [payload_data]
    elif isinstance(payload_data, list):
        payloads = payload_data
    else:
        return jsonify({"status": "error", "message": "Invalid payload format. Expected dict or list."}), 400

    if not payloads:
        return jsonify({"status": "error", "message": "No location data received."}), 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        data_to_insert = []

        for data in payloads:
            required_fields = ['upc', 'shelf_id', 'shelf_row', 'item_position']
            if not all(field in data for field in required_fields) or not data['upc']:
                print("Skipping malformed payload:", data)
                continue

            input_code = str(data['upc']).strip()
            shelf_id = data['shelf_id']
            shelf_row = data['shelf_row']
            item_position = data['item_position']

            truncated_code = input_code.lstrip('0')
            search_pattern = f"%{truncated_code}%"

            system_id_search_code = input_code[:12] if len(input_code) >= 12 else None

            mapping_sql = """
                SELECT system_id FROM products
                WHERE system_id = %s OR upc_id ILIKE %s OR custom_sku ILIKE %s OR manufacture_sku ILIKE %s;
            """
            args = (system_id_search_code, search_pattern, search_pattern, search_pattern)
            cur.execute(mapping_sql, args)
            result = cur.fetchone()

            if result:
                actual_system_id = result[0]
                data_to_insert.append((actual_system_id, shelf_id, shelf_row, item_position))
            else:
                print(f"No product found for code {input_code}, skipping.")

        if not data_to_insert:
            return jsonify({
                "status": "error",
                "message": "No valid codes found in the product database."
            }), 404

        sql_upsert = """
            INSERT INTO inventory (system_id, shelf_id, shelf_row, item_position)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (system_id, shelf_id, shelf_row)
            DO UPDATE SET item_position = EXCLUDED.item_position;
        """
        psycopg2.extras.execute_batch(cur, sql_upsert, data_to_insert)
        conn.commit()

        return jsonify({
            "status": "success",
            "message": f"Successfully mapped and assigned {len(data_to_insert)} locations."
        })

    except psycopg2.IntegrityError as e:
        if 'foreign key constraint' in str(e):
            return jsonify({
                "status": "error",
                "message": "Product data not found for one or more codes. Please sync product data first.",
                "error": str(e)
            }), 404
        return jsonify({"status": "error", "message": str(e)}), 500

    except Exception as e:
        print(e)
        return jsonify({"status": "error", "message": str(e)}), 500

    finally:
        if conn:
            conn.close()

