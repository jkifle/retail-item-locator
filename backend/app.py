import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS 
import psycopg2
import psycopg2.extras # Needed for execute_batch and RealDictCursor
from db import get_db_connection

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
# Initialize CORS to allow requests from the React frontend (e.g., http://localhost:5173)
CORS(app) 

# --- Helper function for consistent error handling ---
def handle_db_error(e, status_code=500):
    """Logs the database error and returns a standard JSON error response."""
    print(f"Database Error: {e}")
    # Rollback any pending transaction in case of an error
    conn = get_db_connection()
    if conn:
        conn.rollback()
        conn.close()
    return jsonify({"status": "error", "message": "A database error occurred.", "error": str(e)}), status_code

# app.py 

# --- API ENDPOINT 1: ITEM LOOKUP (READ) ---
@app.route('/api/lookup', methods=['GET'])
def lookup_item():
    """
    Retrieves item location data and product details based on a UPC, 
    partial name, or brand match.
    """
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([]), 200

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # UPDATED SQL: REMOVING p.description
        sql = """
            SELECT 
                p.upc_id, 
                p.item_name, 
                p.price,
                p.category,
                p.brand,
                i.shelf_id, 
                i.shelf_row, 
                i.item_position
            FROM products p
            JOIN inventory i ON p.upc_id = i.upc_id
            WHERE 
                p.upc_id ILIKE %s OR 
                p.item_name ILIKE %s OR 
                p.brand ILIKE %s  
            ORDER BY p.item_name, i.item_position;
        """
        search_term = f"%{query}%"
        
        # FIX: Now passing EXACTLY THREE search terms: (upc_id, item_name, brand)
        cur.execute(sql, (search_term, search_term, search_term))
        items = cur.fetchall()
        
        return jsonify(items)

    except psycopg2.Error as e:
        # Ensuring we handle errors cleanly if any others pop up
        return handle_db_error(e)
    finally:
        if conn:
            conn.close()

# --- API ENDPOINT 2: INVENTORY SCAN / RELOCATION (LOCATION WRITE) ---
@app.route('/api/import', methods=['POST'])
def import_item():
    """
    Inserts a new item's location or updates an existing item's location (UPSERT).
    Relies on the presence of the UPC in the 'products' table.
    """
    data = request.get_json()
    
    # Simple validation for required location fields
    required_fields = ['upc', 'shelf_id', 'shelf_row', 'item_position']
    if not all(field in data for field in required_fields):
        return jsonify({"status": "error", "message": "Missing required fields for location scan."}), 400

    upc = data['upc']
    shelf_id = data['shelf_id']
    shelf_row = data['shelf_row']
    item_position = data['item_position']

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # SQL UPSERT for the inventory table: Handles location insertion/update.
        sql_upsert = """
            INSERT INTO inventory (upc_id, shelf_id, shelf_row, item_position)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (upc_id, shelf_id, shelf_row) DO UPDATE -- Conflict resolution based on existing item location
            SET shelf_id = EXCLUDED.shelf_id,
                shelf_row = EXCLUDED.shelf_row,
                item_position = EXCLUDED.item_position
        """
        cur.execute(sql_upsert, (upc, shelf_id, shelf_row, item_position))
        conn.commit()

        return jsonify({
            "status": "success",
            "message": f"UPC {upc} assigned to {shelf_id}/{shelf_row} Position {item_position}."
        }), 200

    except psycopg2.IntegrityError as e:
        # Check for specific constraint violation on location (shelf_id, shelf_row, item_position)
        if 'duplicate key value violates unique constraint "inventory_shelf_id_shelf_row_item_position_key"' in str(e):
             return jsonify({
                "status": "error",
                "message": "Conflict! The specified shelf location is already taken.",
                "error": str(e)
            }), 409 # 409 Conflict status code signals frontend to stop auto-increment

        # Check for Foreign Key violation (item not in products table)
        if 'foreign key constraint' in str(e):
             return jsonify({
                "status": "error",
                "message": "Product data not found. Please sync product data first (Product Sync).",
                "error": str(e)
            }), 404
            
        return handle_db_error(e)

    except psycopg2.Error as e:
        return handle_db_error(e)
    finally:
        if conn:
            conn.close()


# --- API ENDPOINT 3: BULK PRODUCT IMPORT (STATIC DATA WRITE) ---
@app.route('/api/product-import', methods=['POST'])
def bulk_product_import():
    """
    Accepts a list of product dictionaries and performs a bulk UPSERT 
    into the dedicated 'products' table.
    """
    products_data = request.get_json()
    if not isinstance(products_data, list) or not products_data:
        return jsonify({"status": "error", "message": "Payload must be a non-empty list of products."}), 400

    # Data preparation for bulk insert
    data_to_insert = []
    for item in products_data:
        upc_value = item.get('upc')
        
        if not upc_value or len(str(upc_value).strip()) == 0:
            print(f"Skipping row due to empty/null UPC: {item}")
            continue

        # Only append valid data
        data_to_insert.append((
            upc_value,
            item.get('custom_sku'),
            item.get('item'),
            item.get('price'),
            item.get('category'),
            item.get('subcat_1'),
            item.get('subcat_2'),
            item.get('subcat_3'),
            item.get('brand')
        ))

    if not data_to_insert:
         return jsonify({
            "status": "error",
            "message": "The uploaded file contained no valid product rows with a UPC."
        }), 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # SQL UPSERT for the products table (9 fields total)
        sql_upsert = """
            INSERT INTO products (
                upc_id, custom_sku, item_name, price, category, subcat_1, subcat_2, subcat_3, brand
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (upc_id) DO UPDATE
            SET custom_sku = EXCLUDED.custom_sku,
                item_name = EXCLUDED.item_name,
                price = EXCLUDED.price,
                category = EXCLUDED.category,
                subcat_1 = EXCLUDED.subcat_1,
                subcat_2 = EXCLUDED.subcat_2,
                subcat_3 = EXCLUDED.subcat_3,
                brand = EXCLUDED.brand;
        """
        
        # Use execute_batch for highly efficient bulk insertion
        psycopg2.extras.execute_batch(cur, sql_upsert, data_to_insert)
        conn.commit()

        return jsonify({
            "status": "success",
            "message": f"Successfully processed {len(data_to_insert)} valid product records."
        }), 200

    except psycopg2.Error as e:
        return handle_db_error(e)
    finally:
        if conn:
            conn.close()


if __name__ == '__main__':
    # Use '0.0.0.0' for deployment readiness and port 5000
    app.run(debug=True, host='0.0.0.0', port=os.getenv('FLASK_PORT', 5000))