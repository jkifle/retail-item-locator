"""Validate repairs by default; apply only with a restore-verified backup."""
import argparse
import hashlib
import io
import json
from pathlib import Path
from psycopg2 import sql
from db import get_db_connection
from schema import check_schema


def fingerprint(connection, schema, table, columns, repaired=False):
    selected = []
    for column in columns:
        actual = "id" if repaired and table == "clients" and column == "client_id" else column
        selected.append(sql.SQL("{} AS {}").format(sql.Identifier(actual), sql.Identifier(column)))
    query = sql.SQL("COPY (SELECT row_to_json(t)::text AS record FROM (SELECT {} FROM {}.{}) t ORDER BY record) TO STDOUT WITH CSV").format(sql.SQL(", ").join(selected), sql.Identifier(schema), sql.Identifier(table))
    data = io.BytesIO()
    with connection.cursor() as cur:
        cur.copy_expert(query.as_string(connection), data)
    return hashlib.sha256(data.getvalue()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--backup", type=Path, help="Directory containing verified manifest.json and database.dump")
    args = parser.parse_args()
    manifest = None
    if args.apply:
        if not args.backup:
            parser.error("--apply requires --backup pointing to a restore-verified backup directory")
        manifest = json.loads((args.backup / "manifest.json").read_text(encoding="utf-8"))
        if not manifest.get("restore_verified"):
            raise RuntimeError("Backup restoration has not been verified")
        if hashlib.sha256((args.backup / "database.dump").read_bytes()).hexdigest() != manifest["archive_sha256"]:
            raise RuntimeError("Backup archive checksum mismatch")
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='30s'")
            cur.execute("LOCK TABLE clients, users, products, inventory IN SHARE ROW EXCLUSIVE MODE")
            cur.execute("SELECT table_schema,table_name,column_name FROM information_schema.columns WHERE table_schema=current_schema() ORDER BY table_name,ordinal_position")
            if any(table == "inventory" and column == "store_id" for schema, table, column in cur.fetchall()):
                raise RuntimeError("Phase 1 repair is superseded by stores; use schema.py to check the current database")
            cur.execute("SELECT table_schema,table_name,column_name FROM information_schema.columns WHERE table_schema=current_schema() ORDER BY table_name,ordinal_position")
            columns = {}
            for schema, table, column in cur.fetchall():
                if table in ("clients", "users", "products", "inventory"):
                    columns.setdefault((schema, table), []).append(column)
        original = {}
        for (schema, table), names in columns.items():
            digest = fingerprint(conn, schema, table, names)
            original[(schema, table)] = digest
            if manifest and digest != manifest["tables"][schema + "." + table]["sha256"]:
                raise RuntimeError("Database has changed since the backup: " + table + ". Create a new verified backup.")
        with conn.cursor() as cur:
            for name in ("database_repair_users.sql", "database_repair_tenancy.sql"):
                migration = Path(__file__).with_name(name).read_text().replace("BEGIN;", "").replace("COMMIT;", "")
                cur.execute(migration)
                print("Validated " + name)
        problems = check_schema(conn)
        if problems:
            raise RuntimeError("; ".join(problems))
        for (schema, table), names in columns.items():
            if fingerprint(conn, schema, table, names, repaired=True) != original[(schema, table)]:
                raise RuntimeError("Existing data changed unexpectedly: " + table)
        print("All original row values preserved; schema checks passed.")
        if args.apply:
            conn.commit()
            print("Database repairs applied.")
        else:
            print("Validation passed. Changes will be rolled back.")
    finally:
        conn.rollback()
        conn.close()


if __name__ == "__main__":
    main()
