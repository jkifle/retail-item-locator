"""Real company-scoped users and stores for account settings."""
from flask import Blueprint, g, jsonify, request
import psycopg2
from uuid import UUID
from auth import require_firebase_auth, require_role
from db import get_db_connection, dict_cursor
from logger import DatabaseError, ValidationError, NotFoundError, format_success_response

settings_bp = Blueprint("settings_api", __name__)


def store_fields():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ValidationError("Store must be a JSON object")
    name, address = data.get("name"), data.get("address", "")
    if not isinstance(name, str) or not name.strip() or len(name.strip()) > 255:
        raise ValidationError("Store name must contain 1 to 255 characters")
    if not isinstance(address, str) or len(address) > 1000:
        raise ValidationError("Address must be a string of at most 1000 characters")
    return name.strip(), address.strip() or None


@settings_bp.route("/users", methods=["GET"])
@require_firebase_auth
@require_role("admin")
def users():
    conn = get_db_connection()
    try:
        with dict_cursor(conn) as cur:
            cur.execute("SELECT user_id,email,display_name,role,is_active FROM users WHERE client_id=%s ORDER BY display_name NULLS LAST,email NULLS LAST,user_id", (g.client_id,))
            result = cur.fetchall()
    except psycopg2.Error as exc:
        raise DatabaseError("Unable to load users") from exc
    finally:
        conn.close()
    return jsonify(format_success_response({"users": result}))


@settings_bp.route("/stores", methods=["GET"])
@require_firebase_auth
def stores():
    conn = get_db_connection()
    try:
        with dict_cursor(conn) as cur:
            cur.execute("""SELECT s.id,s.name,s.address,s.is_active,count(i.id) AS location_count
                FROM stores s LEFT JOIN inventory i ON i.client_id=s.client_id AND i.store_id=s.id
                WHERE s.client_id=%s GROUP BY s.id ORDER BY s.name""", (g.client_id,))
            result = cur.fetchall()
    except psycopg2.Error as exc:
        raise DatabaseError("Unable to load stores") from exc
    finally:
        conn.close()
    return jsonify(format_success_response({"stores": result}))


@settings_bp.route("/stores", methods=["POST"])
@require_firebase_auth
@require_role("admin")
def add_store():
    name, address = store_fields()
    conn = get_db_connection()
    try:
        with dict_cursor(conn) as cur:
            cur.execute("INSERT INTO stores(client_id,name,address) VALUES (%s,%s,%s) RETURNING id,name,address,is_active", (g.client_id,name,address))
            store = cur.fetchone()
        conn.commit()
    except psycopg2.errors.UniqueViolation as exc:
        conn.rollback()
        raise ValidationError("A store with this name already exists in your company") from exc
    except psycopg2.Error as exc:
        conn.rollback()
        raise DatabaseError("Unable to create store") from exc
    finally:
        conn.close()
    return jsonify(format_success_response({"store": store})), 201


@settings_bp.route("/stores/<uuid:store_id>", methods=["PUT"])
@require_firebase_auth
@require_role("admin")
def edit_store(store_id):
    name, address = store_fields()
    conn = get_db_connection()
    try:
        with dict_cursor(conn) as cur:
            cur.execute("UPDATE stores SET name=%s,address=%s,updated_at=CURRENT_TIMESTAMP WHERE id=%s AND client_id=%s RETURNING id,name,address,is_active", (name,address,str(store_id),g.client_id))
            store = cur.fetchone()
            if not store:
                raise NotFoundError("Store not found")
        conn.commit()
    except psycopg2.errors.UniqueViolation as exc:
        conn.rollback()
        raise ValidationError("A store with this name already exists in your company") from exc
    except psycopg2.Error as exc:
        conn.rollback()
        raise DatabaseError("Unable to update store") from exc
    finally:
        conn.close()
    return jsonify(format_success_response({"store": store}))


def resolve_store(connection, client_id, store_id=None):
    """Allow a missing store only when the company has one active store."""
    if store_id is not None:
        try:
            store_id = str(UUID(str(store_id)))
        except (ValueError, TypeError, AttributeError) as exc:
            raise ValidationError("Invalid store ID") from exc
    with connection.cursor() as cur:
        cur.execute("SELECT id FROM stores WHERE client_id=%s AND is_active=TRUE AND (%s::uuid IS NULL OR id=%s::uuid) ORDER BY id LIMIT 2", (client_id,store_id,store_id))
        rows = cur.fetchall()
    if len(rows) != 1:
        raise ValidationError("Select an active store belonging to your company")
    return str(rows[0][0])
