"""Health check routes."""

from datetime import datetime, timezone

from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}), 200


@health_bp.route("/health/ready", methods=["GET"])
def ready():
    from db import get_db_connection
    from logger import DatabaseError, log_error
    from schema import check_schema

    try:
        conn = get_db_connection()
        try:
            problems = check_schema(conn)
        finally:
            conn.close()
        if problems:
            return jsonify({"status": "not_ready", "issues": problems}), 503
    except DatabaseError as exc:
        log_error(exc)
        return jsonify({"status": "not_ready", "message": exc.message}), 503
    return jsonify({"status": "ready"}), 200
