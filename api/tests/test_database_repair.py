"""Opt-in integration test; always rolls back schema and test data."""
import os
import sys
import unittest
from pathlib import Path
from uuid import uuid4
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from db import get_db_connection
from app_factory import create_app


@unittest.skipUnless(os.environ.get("PHASE1_DATABASE_TEST") == "1", "Opt-in database rollback test")
class DatabaseRepairTest(unittest.TestCase):
    def test_repairs_and_tenant_api(self):
        conn = get_db_connection()
        self.addCleanup(conn.close)
        self.addCleanup(conn.rollback)
        class TransactionConnection:
            def cursor(self, *args, **kwargs): return conn.cursor(*args, **kwargs)
            def close(self): pass
            def commit(self): pass
            def rollback(self): pass
        with conn.cursor() as cur:
            cur.execute("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='30s'")
            tenants = [str(uuid4()), str(uuid4())]
            store_ids = [str(uuid4()), str(uuid4()), str(uuid4())]
            uid, code = "p1-" + str(uuid4()), "p1-" + str(uuid4())
            for tenant in tenants:
                cur.execute("INSERT INTO clients(name,id) VALUES (%s,%s)", ("Rollback test", tenant))
            for store_id, tenant, name in [(store_ids[0],tenants[0],"Store one"),(store_ids[1],tenants[0],"Store two"),(store_ids[2],tenants[1],"Foreign store")]:
                cur.execute("INSERT INTO stores(id,client_id,name) VALUES (%s,%s,%s)",(store_id,tenant,name))
            cur.execute("INSERT INTO users(user_id,client_id,role) VALUES (%s,%s,%s)", (uid, tenants[0], "staff"))
        client = create_app().test_client()
        proxy = TransactionConnection()
        headers = {"Authorization": "Bearer test-token"}
        token = {"uid": uid, "email": "phase1@example.invalid"}
        with patch("auth.decode_firebase_token", return_value=token), patch("routes.auth_routes.decode_firebase_token", return_value=token), patch("auth.get_db_connection", return_value=proxy), patch("routes.auth_routes.get_db_connection", return_value=proxy), patch("routes.imports.get_db_connection", return_value=proxy), patch("routes.lookup.get_db_connection", return_value=proxy), patch("routes.settings.get_db_connection", return_value=proxy):
            response = client.post("/api/auth/login", json={"idToken": "test-token"})
            self.assertEqual(response.status_code, 200, response.json)
            response = client.post("/api/products", headers=headers, json=[{"system_id": code, "upc": "1234509876", "description": "Rollback test", "price": 1}])
            self.assertEqual(response.status_code, 200, response.json)
            with conn.cursor() as cur:
                cur.execute("INSERT INTO products(client_id,system_id,description) VALUES (%s,%s,%s)", (tenants[1], code, "Other tenant"))
            response = client.post("/api/import", headers=headers, json=[{"upc": code, "shelf_id": "A", "shelf_row": "1", "item_position": 1, "store_id": store_ids[0]}])
            self.assertEqual(response.status_code, 200, response.json)
            response = client.get("/api/lookup?q=" + code, headers=headers)
            self.assertEqual(response.status_code, 200, response.json)
            self.assertEqual(len(response.json), 1)
            self.assertEqual(response.json[0]["description"], "Rollback test")
            payload = {"upc": code,"shelf_id":"A","shelf_row":"1","item_position":1,"store_id":store_ids[1]}
            self.assertEqual(client.post("/api/import",headers=headers,json=[payload]).status_code,200)
            self.assertEqual(len(client.get("/api/lookup?q="+code,headers=headers).json),2)
            payload["store_id"] = store_ids[2]
            self.assertEqual(client.post("/api/import",headers=headers,json=[payload]).status_code,400)
            payload.pop("store_id")
            self.assertEqual(client.post("/api/import",headers=headers,json=[payload]).status_code,400)
            stores = client.get("/api/stores",headers=headers).json["data"]["stores"]
            self.assertEqual({str(store["id"]) for store in stores},set(store_ids[:2]))
            self.assertEqual(client.get("/api/users",headers=headers).status_code,403)
            with conn.cursor() as cur:
                cur.execute("UPDATE users SET role='admin' WHERE user_id=%s",(uid,))
            users = client.get("/api/users",headers=headers).json["data"]["users"]
            self.assertEqual([user["user_id"] for user in users],[uid])
            response = client.post("/api/stores",headers=headers,json={"name":"New store","address":"Test address"})
            self.assertEqual(response.status_code,201,response.json)
            new_id = response.json["data"]["store"]["id"]
            self.assertEqual(client.put("/api/stores/"+new_id,headers=headers,json={"name":"Renamed store","address":"Updated"}).status_code,200)
            self.assertEqual(client.put("/api/stores/"+store_ids[2],headers=headers,json={"name":"Should not edit"}).status_code,404)

            with conn.cursor() as cur:
                cur.execute("UPDATE users SET role='viewer' WHERE user_id=%s", (uid,))
            self.assertEqual(client.post("/api/products", headers=headers, json=[{"system_id": code}]).status_code, 403)
            with conn.cursor() as cur:
                cur.execute("UPDATE clients SET is_active=FALSE WHERE id=%s", (tenants[0],))
            self.assertEqual(client.get("/api/lookup?q=" + code, headers=headers).status_code, 403)
