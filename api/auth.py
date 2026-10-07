"""Firebase authentication, tenant context, and API key authorization."""

import json
from functools import wraps
from typing import Any

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials
from flask import g, jsonify, request
import psycopg2

from config import config
from db import get_db_connection
from logger import APIError, format_error_response, AuthenticationError, AuthorizationError, DatabaseError, log_error


def _initialize_firebase():
    if firebase_admin._apps:
        return

    if config.firebase_credentials_json:
        cert_info = json.loads(config.firebase_credentials_json)
        firebase_admin.initialize_app(
            credentials.Certificate(cert_info),
            {"projectId": config.firebase_project_id or cert_info.get("project_id")},
        )
        return

    options = {"projectId": config.firebase_project_id} if config.firebase_project_id else None
    firebase_admin.initialize_app(options=options)


def decode_firebase_token(token: str) -> dict[str, Any]:
    if not token:
        raise AuthenticationError("Token is required")

    try:
        _initialize_firebase()
        return firebase_auth.verify_id_token(token, check_revoked=True)
    except Exception as exc:
        raise AuthenticationError(f"Invalid Firebase token: {str(exc)}") from exc


def get_user_from_db(user_id: str, db_connection) -> dict[str, Any] | None:
    try:
        with db_connection.cursor() as cur:
            cur.execute(
                """
                SELECT u.user_id, u.email, u.display_name, u.role, u.is_active, u.client_id, c.is_active
                FROM users u
                LEFT JOIN clients c ON c.id = u.client_id
                WHERE u.user_id = %s
                """,
                (user_id,),
            )
            row = cur.fetchone()
    except psycopg2.Error as exc:
        raise DatabaseError(str(exc)) from exc

    if not row:
        return None

    return {
        "user_id": row[0],
        "email": row[1],
        "display_name": row[2],
        "role": row[3],
        "is_active": bool(row[4] and row[6]),
        "client_id": str(row[5]) if row[5] else None,
    }


def sync_user_profile(user_id: str, email: str, display_name: str, db_connection) -> dict[str, Any]:
    """Update an already provisioned Firebase user profile.

    Users must be provisioned with a client_id before they can access tenant data.
    This avoids silently creating global or orphaned users during signup.
    """
    user = get_user_from_db(user_id, db_connection)
    if not user:
        raise AuthenticationError("User is not provisioned in this application")
    if not user["is_active"]:
        raise AuthorizationError("User account or organization is inactive")
    if not user["client_id"]:
        raise AuthorizationError("User is not assigned to a client")

    try:
        with db_connection.cursor() as cur:
            cur.execute(
                """
                UPDATE users
                SET email = %s, display_name = %s, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
                RETURNING user_id, email, display_name, role, is_active, client_id
                """,
                (email, display_name, user_id),
            )
            row = cur.fetchone()
        db_connection.commit()
    except psycopg2.Error as exc:
        db_connection.rollback()
        raise DatabaseError(str(exc)) from exc

    return {
        "user_id": row[0],
        "email": row[1],
        "display_name": row[2],
        "role": row[3],
        "is_active": row[4],
        "client_id": str(row[5]) if row[5] else None,
    }


def require_firebase_auth(view_func):
    @wraps(view_func)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        try:
            decoded_token = decode_firebase_token(auth_header[7:])
            firebase_uid = decoded_token.get("uid")
            if not firebase_uid:
                raise AuthenticationError("Token missing uid")

            db_conn = get_db_connection()

            try:
                user = get_user_from_db(firebase_uid, db_conn)
            finally:
                db_conn.close()

            if not user:
                raise AuthenticationError("User not found in database")
            if not user.get("is_active"):
                raise AuthorizationError("User account is inactive")
            if not user.get("client_id"):
                raise AuthorizationError("User is not assigned to a client")

            g.user = user
            g.client_id = user["client_id"]
            g.firebase_uid = firebase_uid
            g.firebase_token = decoded_token
        except APIError as exc:
            if exc.status_code >= 500:
                log_error(exc, {"auth": "firebase"})
            return jsonify(format_error_response(exc)), exc.status_code
        except Exception as exc:
            log_error(exc, {"auth": "firebase"})
            return jsonify({"error": "Authentication failed"}), 500

        return view_func(*args, **kwargs)

    return decorated


def require_api_key(view_func):
    """Resolve X-API-Key to exactly one active client_id."""

    @wraps(view_func)
    def decorated(*args, **kwargs):
        api_key = request.headers.get("X-API-Key")
        if not api_key:
            return jsonify({"error": "Missing API Key"}), 401

        db_conn = get_db_connection()
        try:
            with db_conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id
                    FROM clients
                    WHERE api_key = %s
                      AND is_active = TRUE
                    """,
                    (api_key,),
                )
                row = cur.fetchone()
        except psycopg2.Error as exc:
            raise DatabaseError(str(exc)) from exc
        finally:
            db_conn.close()

        if not row:
            return jsonify({"error": "Invalid API Key"}), 401

        g.client_id = str(row[0])
        return view_func(*args, **kwargs)

    return decorated


def require_import_auth(view_func):
    """Accept scoped service keys or provisioned staff/admin Firebase users."""
    @wraps(view_func)
    def decorated(*args, **kwargs):
        if request.headers.get("Authorization"):
            return require_firebase_auth(require_role("admin", "staff")(view_func))(*args, **kwargs)
        return require_api_key(view_func)(*args, **kwargs)
    return decorated


def get_client_context() -> str:
    client_id = getattr(g, "client_id", None)
    if not client_id:
        raise AuthorizationError("Client context is required")
    return str(client_id)


def require_role(*allowed_roles):
    def decorator(view_func):
        @wraps(view_func)
        def decorated(*args, **kwargs):
            user = getattr(g, "user", None)
            if not user:
                return jsonify({"error": "User not found in context"}), 401
            if user.get("role") not in allowed_roles:
                return jsonify({"error": "Insufficient permissions"}), 403
            return view_func(*args, **kwargs)

        return decorated

    return decorator


def log_audit(
    action: str,
    entity_type: str,
    entity_id: str,
    user_id: str,
    client_id: str,
    old_values: dict[str, Any] | None = None,
    new_values: dict[str, Any] | None = None,
    db_connection=None,
) -> None:
    if not db_connection:
        return

    try:
        with db_connection.cursor() as cur:
            cur.execute(
                """
                INSERT INTO audit_logs
                    (client_id, user_id, action, entity_type, entity_id,
                     old_values, new_values, ip_address, user_agent)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    client_id,
                    user_id,
                    action,
                    entity_type,
                    entity_id,
                    json.dumps(old_values) if old_values else None,
                    json.dumps(new_values) if new_values else None,
                    request.remote_addr if request else None,
                    request.user_agent.string if request else None,
                ),
            )
        db_connection.commit()
    except psycopg2.Error as exc:
        db_connection.rollback()
        log_error(exc, {"audit": action, "entity_type": entity_type, "entity_id": entity_id})
