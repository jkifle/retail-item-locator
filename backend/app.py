import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS # 1. Import CORS
import psycopg2
import psycopg2.extras
from db import get_db_connection

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app) # 2. Initialize CORS for cross-origin requests

# --- Helper function for error handling ---
def handle_db_error(e, status_code=500):
    """Logs the database error and returns a standard JSON error response."""
    print(f"Database Error: {e}")
    return jsonify({"status": "error", "message": "A database error occurred.", "error": str(e)}), status_code

# --- API ENDPOINT 1: ITEM LOOKUP (READ) ---
@app.route('/api/lookup', methods=['GET'])
def lookup_item():
    """
    Retrieves item location data based on a UPC or partial name match.
    Query parameter: q (search term)
    """
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([]), 200 # Return empty array if no query is provided

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Use ILIKE for case-insensitive, partial matching on both UPC and Name
        sql = """
            SELECT upc_id, item_name, shelf_id, shelf_row, item_position
            FROM inventory 
            WHERE upc_id ILIKE %s OR item_name ILIKE %s
            ORDER BY item_name, item_position;
        """
        search_term = f"%{query}%"
        cur.execute(sql, (search_term, search_term))
        items = cur.fetchall()
        
        return jsonify(items)

    except psycopg2.Error as e:
        return handle_db_error(e)
    finally:
        if conn:
            conn.close()


# --- API ENDPOINT 2: ITEM IMPORT / RELOCATION (UPSERT / WRITE) ---
@app.route('/api/import', methods=['POST'])
def import_item():
    """
    Inserts a new item or updates an existing item's location (UPSERT).
    Also ensures the location (shelf_id, shelf_row, item_position) is unique.
    """
    data = request.get_json()
    
    # Simple validation
    required_fields = ['upc', 'name', 'shelf_id', 'shelf_row', 'item_position']
    if not all(field in data for field in required_fields):
        return jsonify({"status": "error", "message": "Missing required fields."}), 400

    upc = data['upc']
    name = data['name']
    shelf_id = data['shelf_id']
    shelf_row = data['shelf_row']
    item_position = data['item_position']

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # SQL UPSERT statement: Inserts or updates the item record.
        # It relies on the UNIQUE INDEX we created on (shelf_id, shelf_row, item_position)
        sql_upsert = """
            INSERT INTO inventory (upc_id, item_name, shelf_id, shelf_row, item_position)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (upc_id) DO UPDATE
            SET item_name = EXCLUDED.item_name,
                shelf_id = EXCLUDED.shelf_id,
                shelf_row = EXCLUDED.shelf_row,
                item_position = EXCLUDED.item_position
        """
        cur.execute(sql_upsert, (upc, name, shelf_id, shelf_row, item_position))
        conn.commit()

        return jsonify({
            "status": "success",
            "message": f"UPC {upc} assigned to {shelf_id}/{shelf_row} Position {item_position}."
        }), 200

    except psycopg2.IntegrityError as e:
        # IntegrityError often means the UNIQUE INDEX on location was violated (409 Conflict)
        if 'duplicate key value violates unique constraint' in str(e):
             return jsonify({
                "status": "error",
                "message": "The specified shelf location is already taken.",
                "error": str(e)
            }), 409 # 409 Conflict status code is vital for frontend logic
        return handle_db_error(e)

    except psycopg2.Error as e:
        return handle_db_error(e)
    finally:
        if conn:
            conn.close()


if __name__ == '__main__':
    # Use '0.0.0.0' for deployment readiness
    app.run(debug=True, host='0.0.0.0', port=os.getenv('FLASK_PORT', 5000))