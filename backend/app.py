import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS 
import psycopg2
import psycopg2.extras # Needed for execute_batch and RealDictCursor

# --- Database Connection and Environment Setup ---

load_dotenv()

app = Flask(__name__)
CORS(app) 

DATABASE_URL = os.environ.get('DATABASE_URL')

# --- Helper Functions ---

def get_db_connection():
    """Establishes and returns a new database connection."""
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable not set. Check your .env file.")
    return psycopg2.connect(DATABASE_URL)

def handle_db_error(e, status_code=500):
    """Logs the database error and returns a standard JSON error response."""
    print(f"Database Error: {e}")
    conn = None
    try:
        conn = get_db_connection()
        conn.rollback()
    except Exception:
        pass
    finally:
        if conn:
            conn.close()

    return jsonify({"status": "error", "message": "A database error occurred.", "error": str(e)}), status_code

def empty_to_none(value):
    """Converts empty strings or strings that only contain whitespace to None."""
    if value is None:
        return None
    stripped_value = str(value).strip()
    return stripped_value if stripped_value else None


# app.py (Endpoint 1: /api/lookup)

@app.route('/api/lookup', methods=['GET'])
def lookup_item():
    """
    Retrieves item location data and product details based on robust search logic:
    1. Exact match on the first 12 digits (if input is long) for system_id.
    2. Partial match (ILIKE) on all other identifier and descriptive fields.
    """
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([]), 200

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        input_code = query
        
        # Determine the System ID search parameter (Exact Match)
        system_id_search_code = None
        
        # If the input code is 12 characters or longer, assume the first 12 
        # are the base system ID and use it for an exact match.
        if len(input_code) >= 12:
            system_id_search_code = input_code[:12]
        else:
            system_id_search_code = input_code

        # The pattern for non-SystemID partial matching (strips leading zeros)
        truncated_code = input_code.lstrip('0')
        search_pattern = f"%{truncated_code}%" 
        
        # --- SQL: System ID Exact Match OR General Partial Match ---
        sql = """
            SELECT 
                p.system_id,           
                p.upc_id, 
                p.custom_sku,
                p.ean,
                p.manufacture_sku,
                p.description,
                p.price,
                p.category,
                p.subcat_1, 
                p.subcat_2, 
                p.subcat_3, 
                p.brand,
                i.shelf_id, 
                i.shelf_row, 
                i.item_position
            FROM products p
            JOIN inventory i ON p.system_id = i.system_id
            WHERE 
                p.system_id = %s OR              -- 1. Exact match on the truncated system ID
                p.upc_id ILIKE %s OR             -- 2. Partial match on input code
                p.custom_sku ILIKE %s OR         -- 3. Partial match
                p.ean ILIKE %s OR                -- 4. Partial match (EAN)
                p.manufacture_sku ILIKE %s OR    -- 5. Partial match
                p.description ILIKE %s OR        -- 6. Partial match on description
                p.brand ILIKE %s          
            ORDER BY p.description, i.item_position;
        """
        
        args = (
            system_id_search_code,  # Exact system ID match
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

def empty_to_none(value):
    if value is None:
        return None
    stripped_value = str(value).strip()
    return stripped_value if stripped_value else None


# --- API ENDPOINT 2: INVENTORY SCAN / RELOCATION (LOCATION WRITE) ---
@app.route('/api/import', methods=['POST'])
def import_item():
    """
    Handles single/bulk location import. It maps the input code (UPC/SKU/SystemID) 
    to the actual system_id (PK) using conditional search logic and inserts/updates 
    the location in the inventory table.
    """
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
        
        # 1. ITERATE AND MAP PAYLOADS
        for data in payloads:
            required_fields = ['upc', 'shelf_id', 'shelf_row', 'item_position']
            if not all(field in data for field in required_fields) or not data['upc']:
                print("Skipping malformed or empty payload:", data)
                continue
                
            input_code = str(data['upc']).strip()
            shelf_id = data['shelf_id']
            shelf_row = data['shelf_row']
            item_position = data['item_position']
            
            # The pattern for non-SystemID partial matching (strips leading zeros)
            truncated_code = input_code.lstrip('0')
            search_pattern = f"%{truncated_code}" 
            
            # 1. Determine the System ID search parameter
            system_id_search_code = None
            
            # IF the scanned code is 12 characters or longer, we assume the first 12 
            # are the exact System ID. This handles scanner over-reads.
            if len(input_code) >= 12:
                system_id_search_code = input_code[:12]
            
            # If it's less than 12, rely on the partial match for all fields.


            mapping_sql = """
                SELECT system_id FROM products
                WHERE 
                    system_id = %s OR            -- 1. Exact match on the truncated code (or None)
                    upc_id ILIKE %s OR           -- 2. Partial match on input code
                    custom_sku ILIKE %s OR       -- 3. Partial match
                    manufacture_sku ILIKE %s;    -- 4. Partial match
            """      
            args = (
                system_id_search_code, 
                search_pattern,
                search_pattern,
                search_pattern
            )
            
            cur.execute(mapping_sql, args)
            result = cur.fetchone()

            if result:
                # MAPPING SUCCESS: Retrieve the actual system_id (PK for inventory)
                actual_system_id = result[0] 
                data_to_insert.append((actual_system_id, shelf_id, shelf_row, item_position))
            else:
                print(f"Skipping assignment for code {input_code}: No product found.")

        if not data_to_insert:
             return jsonify({
                "status": "error",
                "message": "The provided data contained no valid codes found in the product database for location assignment."
            }), 404

        # Inserts the system_id and location data. Conflict updates only the item_position.
        sql_upsert = """
            INSERT INTO inventory (system_id, shelf_id, shelf_row, item_position)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (system_id, shelf_id, shelf_row) DO UPDATE
            SET item_position = EXCLUDED.item_position;
        """
        
        psycopg2.extras.execute_batch(cur, sql_upsert, data_to_insert)
        conn.commit()

        return jsonify({
            "status": "success",
            "message": f"Successfully mapped and assigned {len(data_to_insert)} locations."
        }), 200

    except psycopg2.IntegrityError as e:
        # Check for specific constraint violation
        if 'foreign key constraint' in str(e):
             return jsonify({
                 "status": "error",
                 "message": "Product data not found for one or more codes. Please sync product data first.",
                 "error": str(e)
             }), 404 
        
        # Fallback to general error handler
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
    Performs a bulk UPSERT of product data into the 'products' table, using system_id as the primary key.
    The payload now expects the 'description' field.
    """
    products_data = request.get_json()
    if not isinstance(products_data, list) or not products_data:
        return jsonify({"status": "error", "message": "Payload must be a non-empty list of products."}), 400

    data_to_insert = []
    for item in products_data:
        system_id_value = item.get('system_id')
        
        if not system_id_value or len(str(system_id_value).strip()) == 0:
            print(f"Skipping row due to empty/null system_id: {item}")
            continue

        # Map to the 12 fields 
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
         return jsonify({
             "status": "error",
             "message": "The uploaded file contained no valid product rows with a system_id."
         }), 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # SQL UPSERT for the products table
        sql_upsert = """
            INSERT INTO products (
                system_id, upc_id, custom_sku, ean, manufacture_sku, description, price, 
                category, subcat_1, subcat_2, subcat_3, brand
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (system_id) DO UPDATE
            SET 
                upc_id = EXCLUDED.upc_id,
                custom_sku = EXCLUDED.custom_sku,
                ean = EXCLUDED.ean,
                manufacture_sku = EXCLUDED.manufacture_sku,
                description = EXCLUDED.description,   -- UPDATED COLUMN NAME
                price = EXCLUDED.price,
                category = EXCLUDED.category,
                subcat_1 = EXCLUDED.subcat_1,
                subcat_2 = EXCLUDED.subcat_2,
                subcat_3 = EXCLUDED.subcat_3,
                brand = EXCLUDED.brand;
        """
        
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
    app.run(debug=True, host='0.0.0.0', port=os.getenv('FLASK_PORT', 5000))