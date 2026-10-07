"""Product and inventory import endpoints."""

import psycopg2
import psycopg2.extras
from flask import Blueprint, jsonify, request

from auth import get_client_context, require_import_auth
from db import get_db_connection
from logger import DatabaseError, ValidationError, format_error_response
from routes.settings import resolve_store
from validators import empty_to_none, validate_bulk_inventory, validate_bulk_products

import_bp = Blueprint("import_api", __name__)
inventory_bp = Blueprint("inventory_api", __name__)
product_import_bp = Blueprint("product_import_api", __name__)
products_bp = Blueprint("products_api", __name__)


def _product_values(client_id: str, item: dict) -> tuple:
    return (
        client_id,
        item.get("system_id"),
        empty_to_none(item.get("upc")),
        empty_to_none(item.get("custom_sku")),
        empty_to_none(item.get("ean")),
        empty_to_none(item.get("manufacture_sku")),
        empty_to_none(item.get("description")),
        item.get("price"),
        empty_to_none(item.get("category")),
        empty_to_none(item.get("subcat_1")),
        empty_to_none(item.get("subcat_2")),
        empty_to_none(item.get("subcat_3")),
        empty_to_none(item.get("brand")),
    )


def _import_products():
    client_id = get_client_context()
    products_data = request.get_json(silent=True)
    is_valid, error_msg, valid_items = validate_bulk_products(products_data)
    if not is_valid:
        raise ValidationError(error_msg)

    rows = [_product_values(client_id, item) for item in valid_items]
    sql = """
        INSERT INTO products (
            client_id, system_id, upc_id, custom_sku, ean, manufacture_sku,
            description, price, category, subcat_1, subcat_2, subcat_3, brand
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (client_id, system_id) DO UPDATE
        SET upc_id = EXCLUDED.upc_id,
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

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            psycopg2.extras.execute_batch(cur, sql, rows)
        conn.commit()
    except psycopg2.Error as exc:
        conn.rollback()
        raise DatabaseError(str(exc)) from exc
    finally:
        conn.close()

    return jsonify({"status": "success", "message": f"Processed {len(rows)} product records."}), 200


def _inventory_rows(client_id: str, store_id: str, valid_items: list[dict], cur) -> list[tuple]:
    rows: list[tuple] = []
    mapping_sql = """
        SELECT system_id
        FROM products
        WHERE client_id = %s
          AND (
              system_id = %s OR (upc_id IS NOT NULL AND upc_id <> '' AND COALESCE(NULLIF(ltrim(upc_id, '0'), ''), '0') = %s) OR lower(custom_sku) = lower(%s) OR
              (ean IS NOT NULL AND ean <> '' AND COALESCE(NULLIF(ltrim(ean, '0'), ''), '0') = %s) OR lower(manufacture_sku) = lower(%s)
          )
        ORDER BY system_id
        LIMIT 2;
    """

    for item in valid_items:
        input_code = str(item["upc"]).strip()
        truncated_code = input_code.lstrip("0") or "0"

        cur.execute(
            mapping_sql,
            (
                client_id,
                input_code,
                truncated_code,
                input_code,
                truncated_code,
                input_code,
            ),
        )
        matches = cur.fetchall()
        if len(matches) != 1:
            raise ValidationError(f"Code {input_code} must match exactly one product; found {len(matches)} matches")
        product = matches[0]
        if product:
            rows.append(
                (
                    client_id,
                    store_id,
                    product[0],
                    item["shelf_id"],
                    item["shelf_row"],
                    int(item["item_position"]),
                )
            )

    return rows


def _import_inventory():
    client_id = get_client_context()
    payload_data = request.get_json(silent=True)
    is_valid, error_msg, valid_items = validate_bulk_inventory(payload_data)
    if not is_valid:
        raise ValidationError(error_msg)

    upsert_sql = """
        INSERT INTO inventory (client_id, store_id, system_id, shelf_id, shelf_row, item_position)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (client_id, store_id, system_id, shelf_id, shelf_row)
        DO UPDATE SET item_position = EXCLUDED.item_position;
    """

    conn = get_db_connection()
    try:
        store_ids = {item.get("store_id") for item in valid_items}
        if len(store_ids) != 1:
            raise ValidationError("Each import must target one store")
        store_id = resolve_store(conn, client_id, next(iter(store_ids)))
        with conn.cursor() as cur:
            rows = _inventory_rows(client_id, store_id, valid_items, cur)
            if not rows:
                raise ValidationError("No matching products found for the submitted codes")
            psycopg2.extras.execute_batch(cur, upsert_sql, rows)
        conn.commit()
    except ValidationError:
        conn.rollback()
        raise
    except psycopg2.Error as exc:
        conn.rollback()
        raise DatabaseError(str(exc)) from exc
    finally:
        conn.close()

    return jsonify({"status": "success", "message": f"Mapped {len(rows)} locations."}), 200


@product_import_bp.route("", methods=["POST"])
@require_import_auth
def product_import_handler():
    try:
        return _import_products()
    except (ValidationError, DatabaseError) as exc:
        return jsonify(format_error_response(exc)), exc.status_code


@products_bp.route("", methods=["POST"])
@require_import_auth
def products_handler():
    try:
        return _import_products()
    except (ValidationError, DatabaseError) as exc:
        return jsonify(format_error_response(exc)), exc.status_code


@import_bp.route("", methods=["POST"])
@require_import_auth
def import_handler():
    try:
        return _import_inventory()
    except (ValidationError, DatabaseError) as exc:
        return jsonify(format_error_response(exc)), exc.status_code


@inventory_bp.route("", methods=["POST"])
@require_import_auth
def inventory_handler():
    try:
        return _import_inventory()
    except (ValidationError, DatabaseError) as exc:
        return jsonify(format_error_response(exc)), exc.status_code
