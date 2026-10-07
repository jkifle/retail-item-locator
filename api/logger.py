"""Centralized logging and JSON error responses."""

import logging
import sys
from datetime import datetime, timezone
from typing import Any

from flask import jsonify, request

from config import config

logger = logging.getLogger("retail_item_locator")
logger.setLevel(getattr(logging, config.log_level.upper(), logging.INFO))
logger.propagate = False

if not logger.handlers:
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setLevel(getattr(logging, config.log_level.upper(), logging.INFO))
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)


class APIError(Exception):
    """Base API error."""

    def __init__(self, message: str, status_code: int = 400, error_code: str | None = None):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or self.__class__.__name__
        super().__init__(message)


class ValidationError(APIError):
    def __init__(self, message: str):
        super().__init__(message, 400, "VALIDATION_ERROR")


class AuthenticationError(APIError):
    def __init__(self, message: str):
        super().__init__(message, 401, "AUTHENTICATION_ERROR")


class AuthorizationError(APIError):
    def __init__(self, message: str):
        super().__init__(message, 403, "AUTHORIZATION_ERROR")


class NotFoundError(APIError):
    def __init__(self, message: str):
        super().__init__(message, 404, "NOT_FOUND")


class DatabaseError(APIError):
    def __init__(self, message: str = "A database error occurred"):
        super().__init__(message, 500, "DATABASE_ERROR")


def format_error_response(error: APIError) -> dict[str, Any]:
    return {
        "error": error.error_code,
        "message": error.message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "path": request.path if request else None,
    }


def format_success_response(data: Any = None, message: str | None = None) -> dict[str, Any]:
    response = {
        "status": "success",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if message:
        response["message"] = message
    if data is not None:
        response["data"] = data
    return response


def log_request(method: str, path: str, status_code: int, duration_ms: float, user_id: str | None):
    user_info = f" [User: {user_id}]" if user_id else ""
    logger.info("%s %s %s%s [%.2fms]", method, path, status_code, user_info, duration_ms)


def log_error(error: Exception, context: dict[str, Any] | None = None):
    logger.error("%s | Context: %s", str(error), context or {}, exc_info=True)


def register_error_handlers(app):
    @app.errorhandler(APIError)
    def handle_api_error(error):
        if error.status_code >= 500:
            log_error(error)
        return jsonify(format_error_response(error)), error.status_code

    @app.errorhandler(404)
    def handle_404(_error):
        return jsonify(
            {
                "error": "NOT_FOUND",
                "message": "The requested resource was not found",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "path": request.path,
            }
        ), 404

    @app.errorhandler(500)
    def handle_500(error):
        log_error(error)
        return jsonify(
            {
                "error": "INTERNAL_SERVER_ERROR",
                "message": "An internal server error occurred",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        ), 500
