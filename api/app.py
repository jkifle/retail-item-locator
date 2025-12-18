# app.py
import os
import psycopg2
import psycopg2.extras
from flask import Flask, Blueprint, request, jsonify
from flask_cors import CORS

# Helper Functions
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

def handle_db_error(e):
    print(f"Database error: {e}")
    return jsonify({"status": "error", "message": "A database error occurred.", "error": str(e)}), 500

# Blueprint: Import API
import_bp = Blueprint("import_api", __name__)

@import_bp.route("/", methods=["POST"])
def import_handler():
    payload_data = request.get_json()
    
    if isinstance(payload_data, dict):
        payloads = [payload_data]
    elif isinstance(payload_data, list):
        payloads = payload_data
    else:
        return jsonify({"status": "error", "message": "Invalid payload format."}), 400

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

        if not data_to_insert:
            return jsonify({"status": "error", "message": "No valid codes found."}), 404

        sql_upsert = """
            INSERT INTO inventory (system_id, shelf_id, shelf_row, item_position)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (system_id, shelf_id, shelf_row)
            DO UPDATE SET item_position = EXCLUDED.item_position;
        """
        psycopg2.extras.execute_batch(cur, sql_upsert, data_to_insert)
        conn.commit()

        return jsonify({"status": "success", "message": f"Mapped {len(data_to_insert)} locations."})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if conn:
            conn.close()

# Blueprint: Product Import API
product_import_bp = Blueprint("product_import_api", __name__)

@product_import_bp.route("/", methods=["POST"])
def product_import_handler():
    products_data = request.get_json()
    if not isinstance(products_data, list) or not products_data:
        return jsonify({"status": "error", "message": "Payload must be a non-empty list of products."}), 400

    data_to_insert = []
    for item in products_data:
        system_id_value = item.get('system_id')
        if not system_id_value or len(str(system_id_value).strip()) == 0:
            continue

        data_to_insert.append((
            system_id_value,
            empty_to_none(item.get('upc')),
            empty_to_none(item.get('custom_sku')),
            empty_to_none(item.get('ean')),
            empty_to_none(item.get('manufacture_sku')),
            item.get('description'),
            item.get('price'),
            item.get('category'),
            item.get('subcat_1'),
            item.get('subcat_2'),
            item.get('subcat_3'),
            item.get('brand')
        ))

    if not data_to_insert:
        return jsonify({"status": "error", "message": "No valid product rows with a system_id."}), 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        sql_upsert = """
            INSERT INTO products (
                system_id, upc_id, custom_sku, ean, manufacture_sku,
                description, price, category, subcat_1, subcat_2, subcat_3, brand
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (system_id) DO UPDATE
            SET 
                upc_id = EXCLUDED.upc_id,
                custom_sku = EXCLUDED.custom_sku,
                ean = EXCLUDED.ean,
                manufacture_sku = EXCLUDED.manufacture_sku,
                description = EXCLUDED.description,
                price = EXCLUDED.price,
                category = EXCLUDED.category,
                subcat_1 = EXCLUDED.subcat_1,
                subcat_2 = EXCLUDED.subcat_2,
                subcat_3 = EXCLUDED.subcat_3,
                brand = EXCLUDED.brand;
        """
        psycopg2.extras.execute_batch(cur, sql_upsert, data_to_insert)
        conn.commit()

        return jsonify({"status": "success", "message": f"Processed {len(data_to_insert)} product records."})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if conn:
            conn.close()

# Blueprint: Lookup API
lookup_bp = Blueprint("lookup_api", __name__)

@lookup_bp.route("/", methods=["GET"])
def lookup_handler():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify([])

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        input_code = query
        system_id_search_code = input_code[:12] if len(input_code) >= 12 else input_code
        truncated_code = input_code.lstrip('0')
        search_pattern = f"%{truncated_code}%"

        sql = """
            SELECT 
                p.system_id, p.upc_id, p.custom_sku, p.ean, p.manufacture_sku,
                p.description, p.price, p.category, p.subcat_1, p.subcat_2, p.subcat_3,
                p.brand, i.shelf_id, i.shelf_row, i.item_position
            FROM products p
            JOIN inventory i ON p.system_id = i.system_id
            WHERE p.system_id = %s OR
                  p.upc_id ILIKE %s OR
                  p.custom_sku ILIKE %s OR
                  p.ean ILIKE %s OR
                  p.manufacture_sku ILIKE %s OR
                  p.description ILIKE %s OR
                  p.brand ILIKE %s
            ORDER BY p.description, i.item_position;
        """
        args = (
            system_id_search_code,
            search_pattern,
            search_pattern,
            search_pattern,
            search_pattern,
            search_pattern,
            search_pattern
        )

        cur.execute(sql, args)
        items = cur.fetchall()
        return jsonify(items)

    except psycopg2.Error as e:
        return handle_db_error(e)
    finally:
        if conn:
            conn.close()

# Main Flask App
app = Flask(__name__)
CORS(
    app,
    origins=["https://retail-item-locator.onrender.com"],
    methods=["GET", "POST", "OPTIONS"],  # include OPTIONS for preflight
    allow_headers=["Content-Type", "Authorization"]  # headers sent in fetch
)
# Register all blueprints
app.register_blueprint(import_bp, url_prefix="/api/import")
app.register_blueprint(product_import_bp, url_prefix="/api/product-import")
app.register_blueprint(lookup_bp, url_prefix="/api/lookup")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
