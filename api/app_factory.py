"""Flask application factory."""

import time
from datetime import datetime, timezone

from flask import Flask, g, request
from flask_cors import CORS

from config import config
from logger import log_request, register_error_handlers
from routes import register_blueprints


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["DEBUG"] = config.debug

    CORS(
        app,
        origins=config.cors_origins,
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-API-Key"],
    )

    register_error_handlers(app)
    register_blueprints(app)

    @app.before_request
    def before_request():
        g.start_time = time.time()
        g.user = None
        g.client_id = None

    @app.after_request
    def after_request(response):
        duration_ms = (time.time() - g.start_time) * 1000 if hasattr(g, "start_time") else 0
        user = getattr(g, "user", None)
        user_id = user.get("user_id") if user else None
        log_request(request.method, request.path, response.status_code, duration_ms, user_id)
        return response

    @app.route("/", methods=["GET"])
    def root():
        return {"status": "ok", "service": "retail-item-locator-api", "timestamp": datetime.now(timezone.utc).isoformat()}

    return app
