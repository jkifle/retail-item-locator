"""Create a logical backup and verify it in an isolated PostgreSQL container."""
import hashlib
import io
import json
import os
from pathlib import Path
import secrets
import subprocess
import time
from datetime import datetime, timezone
from psycopg2 import sql
from psycopg2.extensions import parse_dsn
from config import config
from db import get_db_connection

IMAGE = "postgres:17-alpine"


def run(command, **kwargs):
    result = subprocess.run(command, stderr=subprocess.PIPE, **kwargs)
    if result.returncode:
        raise RuntimeError("PostgreSQL backup/restore command failed; source database is unchanged")
    return result


def main():
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    directory = Path(__file__).resolve().parents[1] / ".backups" / ("neon-before-phase1-" + stamp)
    directory.mkdir(parents=True, exist_ok=False)
    archive = directory / "database.dump"
    connection = get_db_connection()
    container = "retail-restore-check-" + secrets.token_hex(6)
    started = False
    try:
        connection.set_session(isolation_level="REPEATABLE READ", readonly=True)
        manifest = {"created_at": stamp, "backup_type": "PostgreSQL custom-format logical database backup", "tables": {}}
        with connection.cursor() as cur:
            cur.execute("SELECT pg_export_snapshot()")
            snapshot = cur.fetchone()[0]
            cur.execute("SELECT table_schema,table_name FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema NOT IN ('pg_catalog','information_schema') ORDER BY table_schema,table_name")
            tables = cur.fetchall()
            for schema, table in tables:
                cur.execute(sql.SQL("SELECT count(*) FROM {}.{}").format(sql.Identifier(schema), sql.Identifier(table)))
                count = cur.fetchone()[0]
                query = sql.SQL("COPY (SELECT row_to_json(t)::text AS record FROM {}.{} t ORDER BY record) TO STDOUT WITH CSV").format(sql.Identifier(schema), sql.Identifier(table)).as_string(connection)
                data = io.BytesIO()
                cur.copy_expert(query, data)
                manifest["tables"][schema + "." + table] = {"rows": count, "sha256": hashlib.sha256(data.getvalue()).hexdigest(), "check_query": query}
        dsn = parse_dsn(config.database_url)
        environment = os.environ.copy()
        pg_environment = {"PGHOST": dsn.get("host", ""), "PGPORT": dsn.get("port", "5432"), "PGDATABASE": dsn.get("dbname", ""), "PGUSER": dsn.get("user", ""), "PGPASSWORD": dsn.get("password", ""), "PGSSLMODE": dsn.get("sslmode", "require"), "PGCONNECT_TIMEOUT": "10"}
        environment.update(pg_environment)
        command = ["docker", "run", "--rm"]
        for name in pg_environment:
            command += ["-e", name]
        command += [IMAGE, "pg_dump", "--format=custom", "--snapshot=" + snapshot]
        with archive.open("wb") as output:
            run(command, env=environment, stdout=output)
        connection.rollback()
        with archive.open("rb") as source:
            listing = run(["docker", "run", "--rm", "-i", IMAGE, "pg_restore", "--list"], stdin=source, stdout=subprocess.PIPE).stdout
        (directory / "archive-contents.txt").write_bytes(listing)
        manifest["archive_sha256"] = hashlib.sha256(archive.read_bytes()).hexdigest()
        environment["POSTGRES_PASSWORD"] = secrets.token_urlsafe(32)
        run(["docker", "run", "-d", "--name", container, "--network=none", "-e", "POSTGRES_PASSWORD", IMAGE], env=environment, stdout=subprocess.PIPE)
        started = True
        for attempt in range(30):
            ready = subprocess.run(["docker", "exec", container, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if ready.returncode == 0:
                break
            time.sleep(1)
        else:
            raise RuntimeError("Isolated restore test did not start")
        with archive.open("rb") as source:
            run(["docker", "exec", "-i", container, "pg_restore", "--exit-on-error", "--no-owner", "--no-privileges", "-U", "postgres", "-d", "postgres"], stdin=source, stdout=subprocess.PIPE)
        for name, metadata in manifest["tables"].items():
            restored = run(["docker", "exec", container, "psql", "-X", "-q", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-c", metadata["check_query"]], stdout=subprocess.PIPE).stdout
            if hashlib.sha256(restored).hexdigest() != metadata["sha256"]:
                raise RuntimeError("Restored data fingerprint mismatch: " + name)
            metadata.pop("check_query")
            print(name + ": " + str(metadata["rows"]) + " restored rows verified")
        manifest["restore_verified"] = True
        (directory / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        print("Verified recovery backup: " + str(archive))
    finally:
        connection.rollback()
        connection.close()
        if started:
            subprocess.run(["docker", "rm", "-f", "-v", container], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


if __name__ == "__main__":
    main()
