"""Route registration helpers."""

from routes.auth_routes import auth_bp
from routes.health import health_bp
from routes.imports import import_bp, inventory_bp, product_import_bp, products_bp
from routes.lookup import lookup_bp
from routes.settings import settings_bp


def register_blueprints(app):
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(import_bp, url_prefix="/api/import")
    app.register_blueprint(inventory_bp, url_prefix="/api/inventory")
    app.register_blueprint(product_import_bp, url_prefix="/api/product-import")
    app.register_blueprint(products_bp, url_prefix="/api/products")
    app.register_blueprint(lookup_bp, url_prefix="/api/lookup")
    app.register_blueprint(health_bp)
    app.register_blueprint(settings_bp, url_prefix="/api")
