"""Authentication endpoints."""

from flask import Blueprint, jsonify, request

from auth import decode_firebase_token, require_firebase_auth, sync_user_profile
from db import get_db_connection
from logger import APIError, format_error_response, format_success_response, log_error

auth_bp = Blueprint("auth_api", __name__)


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "JSON object with idToken is required"}), 400
    id_token = data.get("idToken")
    if not isinstance(id_token, str) or not id_token.strip():
        return jsonify({"error": "idToken is required"}), 400

    try:
        decoded_token = decode_firebase_token(id_token)
        firebase_uid = decoded_token.get("uid")
        if not firebase_uid:
            return jsonify({"error": "Token missing uid"}), 401
        email = decoded_token.get("email", "")
        display_name = decoded_token.get("name") or decoded_token.get("display_name") or email

        conn = get_db_connection()
        try:
            user = sync_user_profile(firebase_uid, email, display_name, conn)
        finally:
            conn.close()

        if not user["is_active"]:
            return jsonify({"error": "User account is inactive"}), 403
        if not user["client_id"]:
            return jsonify({"error": "User is not assigned to a client"}), 403

        return jsonify(format_success_response({"user": user}, "Login successful")), 200
    except APIError as exc:
        return jsonify(format_error_response(exc)), exc.status_code
    except Exception as exc:
        log_error(exc, {"endpoint": "auth.login"})
        return jsonify({"error": "Login failed"}), 500


@auth_bp.route("/me", methods=["GET"])
@require_firebase_auth
def me():
    from flask import g

    return jsonify(format_success_response({"user": g.user})), 200
