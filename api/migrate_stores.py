"""Add stores after checking a restore-verified backup; dry-run by default."""
import argparse
import hashlib
import json
from pathlib import Path
from db import get_db_connection
from schema import check_schema
from migrate import fingerprint


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--backup", type=Path, required=True)
    args = parser.parse_args()
    manifest = json.loads((args.backup / "manifest.json").read_text(encoding="utf-8"))
    if not manifest.get("restore_verified") or hashlib.sha256((args.backup / "database.dump").read_bytes()).hexdigest() != manifest["archive_sha256"]:
        raise RuntimeError("A checksum-valid, restore-verified backup is required")
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='30s'")
            cur.execute("LOCK TABLE clients,users,products,inventory IN SHARE ROW EXCLUSIVE MODE")
            cur.execute("SELECT table_schema,table_name,column_name FROM information_schema.columns WHERE table_schema=current_schema() ORDER BY table_name,ordinal_position")
            columns = {}
            for schema, table, column in cur.fetchall():
                if table in ("clients","users","products","inventory"):
                    columns.setdefault((schema,table), []).append(column)
        for (schema,table), names in columns.items():
            if fingerprint(conn,schema,table,names) != manifest["tables"][schema+"."+table]["sha256"]:
                raise RuntimeError("Database changed since backup: " + table)
        with conn.cursor() as cur:
            cur.execute(Path(__file__).with_name("database_stores.sql").read_text())
        issues = check_schema(conn)
        if issues:
            raise RuntimeError("; ".join(issues))
        for (schema,table), names in columns.items():
            if fingerprint(conn,schema,table,names) != manifest["tables"][schema+"."+table]["sha256"]:
                raise RuntimeError("Existing row values changed unexpectedly: " + table)
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM inventory i LEFT JOIN stores s ON s.id=i.store_id AND s.client_id=i.client_id WHERE s.id IS NULL")
            if cur.fetchone()[0]:
                raise RuntimeError("Inventory store ownership check failed")
        if args.apply:
            conn.commit()
            print("Stores migration applied; all original values and tenant assignments preserved.")
        else:
            print("Stores migration validated; all changes rolled back.")
    finally:
        conn.rollback()
        conn.close()


if __name__ == "__main__":
    main()
