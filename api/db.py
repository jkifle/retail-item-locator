"""Database connection helpers."""

import psycopg2
import psycopg2.extras

from config import config
from logger import DatabaseError


def get_db_connection():
    if not config.database_url:
        raise DatabaseError("DATABASE_URL is not configured")
    try:
        return psycopg2.connect(config.database_url, connect_timeout=5)
    except psycopg2.OperationalError as exc:
        raise DatabaseError("Database unavailable. Check DATABASE_URL and that PostgreSQL is running.") from exc


def dict_cursor(connection):
    return connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
