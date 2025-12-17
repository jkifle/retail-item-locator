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

@app.route("/", methods=["GET"])
def handler():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify([])

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        system_id_search_code = query[:12] if len(query) >= 12 else query
        search_pattern = f"%{query.lstrip('0')}%"

        sql = """
            SELECT 
                p.system_id, p.upc_id, p.custom_sku, p.ean, p.manufacture_sku,
                p.description, p.price, p.category, p.subcat_1, p.subcat_2, p.subcat_3,
                p.brand, i.shelf_id, i.shelf_row, i.item_position
            FROM products p
            JOIN inventory i ON p.system_id = i.system_id
            WHERE p.system_id = %s OR p.upc_id ILIKE %s OR p.custom_sku ILIKE %s
               OR p.ean ILIKE %s OR p.manufacture_sku ILIKE %s OR p.description ILIKE %s
               OR p.brand ILIKE %s
            ORDER BY p.description, i.item_position;
        """
        args = (system_id_search_code, search_pattern, search_pattern, search_pattern,
                search_pattern, search_pattern, search_pattern)
        cur.execute(sql, args)
        items = cur.fetchall()
        return jsonify(items)

    except Exception as e:
        print(e)
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if conn:
            conn.close()
