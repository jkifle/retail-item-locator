"""Tenant-scoped product lookup endpoints."""

import psycopg2
from flask import Blueprint, jsonify, request

from auth import get_client_context, require_firebase_auth
from db import dict_cursor, get_db_connection
from logger import DatabaseError, ValidationError, format_error_response
from validators import validate_lookup_query



lookup_bp = Blueprint("lookup_api", __name__)


@lookup_bp.route("", methods=["GET"])
@require_firebase_auth
def lookup_handler():
    query = request.args.get("q", "").strip()
    is_valid, error_msg = validate_lookup_query(query)
    if not is_valid:
        if not query:
            return jsonify([])
        raise ValidationError(error_msg)

    client_id = get_client_context()
    input_code = query
    system_id_search_code = input_code
    search_pattern = f"%{(input_code.lstrip('0') or '0')}%"

    sql = """
        SELECT
            p.id,
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
            i.id AS inventory_id,
            i.shelf_id,
            i.shelf_row,
            i.item_position,
            i.store_id,
            s.name AS store_name
        FROM products p
        LEFT JOIN inventory i
          ON i.client_id = p.client_id
         AND i.system_id = p.system_id
        LEFT JOIN stores s ON s.id=i.store_id AND s.client_id=i.client_id
        WHERE p.client_id = %s
          AND (
              p.system_id = %s OR
              p.upc_id ILIKE %s OR
              p.custom_sku ILIKE %s OR
              p.ean ILIKE %s OR
              p.manufacture_sku ILIKE %s OR
              p.description ILIKE %s OR
              p.brand ILIKE %s
          )
        ORDER BY p.description, i.item_position;
    """
    params = (
        client_id,
        system_id_search_code,
        search_pattern,
        search_pattern,
        search_pattern,
        search_pattern,
        search_pattern,
        search_pattern,
    )

    conn = get_db_connection()
    try:
        with dict_cursor(conn) as cur:
            cur.execute(sql, params)
            items = cur.fetchall()
    except psycopg2.Error as exc:
        raise DatabaseError(str(exc)) from exc
    finally:
        conn.close()

    return jsonify(items), 200
