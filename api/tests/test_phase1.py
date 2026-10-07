import sys
from pathlib import Path
import unittest
from unittest.mock import patch
import psycopg2

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app_factory import create_app
from logger import DatabaseError
from validators import validate_bulk_products, validate_inventory_payload


class Phase1Tests(unittest.TestCase):
    def setUp(self):
        self.client = create_app().test_client()

    def test_login_rejects_non_object_and_missing_token(self):
        for payload in ([], [1], "token", {}, {"idToken": 2}):
            self.assertEqual(self.client.post("/api/auth/login", json=payload).status_code, 400)

    def test_lookup_requires_auth(self):
        self.assertEqual(self.client.get("/api/lookup?q=test").status_code, 401)

    def test_import_requires_auth(self):
        self.assertEqual(self.client.post("/api/products", json=[{"system_id": "1"}]).status_code, 401)

    @patch("auth.decode_firebase_token", return_value={"uid": "user"})
    @patch("auth.get_db_connection")
    @patch("auth.get_user_from_db")
    def test_viewer_cannot_import(self, user, connection, token):
        user.return_value = {"user_id": "user", "client_id": "tenant", "role": "viewer", "is_active": True}
        self.assertEqual(self.client.post("/api/products", headers={"Authorization": "Bearer token"}, json=[{"system_id": "1"}]).status_code, 403)
        connection.return_value.close.assert_called_once()

    @patch("auth.decode_firebase_token", return_value={"uid": "user"})
    @patch("auth.get_db_connection", side_effect=DatabaseError("Database unavailable"))
    def test_database_failure_has_actionable_response(self, connection, token):
        response = self.client.get("/api/lookup?q=test", headers={"Authorization": "Bearer token"})
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json["error"], "DATABASE_ERROR")

    @patch("db.psycopg2.connect", side_effect=psycopg2.OperationalError("private connection details"))
    def test_connection_errors_do_not_expose_credentials(self, connect):
        from db import get_db_connection
        with patch("db.config", database_url="postgres://secret"):
            with self.assertRaises(DatabaseError) as error:
                get_db_connection()
        self.assertNotIn("private", str(error.exception))

    def test_invalid_product_prevents_partial_import(self):
        valid, message, rows = validate_bulk_products([{"system_id": "1"}, {"price": 2}])
        self.assertFalse(valid)
        self.assertIn("row 2", message)
        self.assertEqual(rows, [])

    def test_prices_must_be_finite(self):
        for price in ("NaN", "Infinity", -1, True):
            self.assertFalse(validate_bulk_products([{"system_id": "1", "price": price}])[0])

    def test_positions_must_be_positive_integers(self):
        for position in (0, -1, 1.5, True):
            self.assertFalse(validate_inventory_payload({"upc": "1", "shelf_id": "A", "shelf_row": "B", "item_position": position})[0])

    @patch("db.get_db_connection", side_effect=DatabaseError("Database unavailable"))
    def test_readiness_fails_when_database_unavailable(self, connection):
        self.assertEqual(self.client.get("/health/ready").status_code, 503)
        self.assertEqual(self.client.get("/health").status_code, 200)

    @patch("db.get_db_connection")
    def test_readiness_reports_missing_schema(self, connection):
        cursor = connection.return_value.cursor.return_value.__enter__.return_value
        cursor.fetchall.return_value = []
        response = self.client.get("/health/ready")
        self.assertEqual(response.status_code, 503)
        self.assertTrue(any("users" in issue for issue in response.json["issues"]))
        connection.return_value.close.assert_called_once()


if __name__ == "__main__":
    unittest.main()
