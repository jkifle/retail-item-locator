# api/lookup.py
import os
import psycopg2
import psycopg2.extras
import json

DATABASE_URL = os.environ.get("DATABASE_URL")


def get_db_connection():
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL not set")
    return psycopg2.connect(DATABASE_URL)


# Vercel serverless handler
def handler(request):
    # Read query parameter
    try:
        query_params = request.query or {}
        query = query_params.get("q", "").strip()
    except Exception:
        query = ""

    if not query:
        return {
            "statusCode": 200,
            "body": json.dumps([]),
        }

    print("Proof the api works")
    conn = None
    try:
        conn = get_db_connection()
        print("Database connection established.")
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        input_code = query
        system_id_search_code = input_code[:12] if len(input_code) >= 12 else input_code
        truncated_code = input_code.lstrip("0")
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
            search_pattern,
        )

        cur.execute(sql, args)
        items = cur.fetchall()
        return {
            "statusCode": 200,
            "body": json.dumps(items, default=str),
        }

    except psycopg2.Error as e:
        print(f"Database error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({
                "status": "error",
                "message": "A database error occurred.",
                "error": str(e),
            }),
        }

    finally:
        if conn:
            conn.close()
