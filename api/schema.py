"""Read-only schema checks shared by readiness and setup tools."""

REQUIRED_COLUMNS = {
    "clients": {"id", "api_key", "is_active"},
    "users": {"user_id", "email", "display_name", "role", "is_active", "client_id", "updated_at"},
    "products": {"id", "client_id", "system_id", "upc_id", "custom_sku", "ean", "manufacture_sku", "description", "price", "category", "subcat_1", "subcat_2", "subcat_3", "brand"},
    "stores": {"id", "client_id", "name", "address", "is_active"},
    "inventory": {"id", "store_id", "client_id", "system_id", "shelf_id", "shelf_row", "item_position"},
}


def check_schema(connection):
    with connection.cursor() as cur:
        cur.execute("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = current_schema()")
        actual = {}
        for table, column in cur.fetchall():
            actual.setdefault(table, set()).add(column)
    problems = [f"{table}: missing {', '.join(sorted(columns - actual.get(table, set())))}"
            for table, columns in REQUIRED_COLUMNS.items() if columns - actual.get(table, set())]
    if problems:
        return problems
    with connection.cursor() as cur:
        cur.execute("""
            SELECT t.relname, array_agg(a.attname ORDER BY k.position)
            FROM pg_index i
            JOIN pg_class t ON t.oid=i.indrelid
            JOIN pg_namespace n ON n.oid=t.relnamespace
            CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY k(attnum, position)
            JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.attnum
            WHERE n.nspname=current_schema() AND i.indisunique AND i.indisvalid
              AND i.indpred IS NULL AND k.position <= i.indnkeyatts
            GROUP BY t.relname, i.indexrelid
        """)
        unique_keys = {(table, tuple(columns)) for table, columns in cur.fetchall()}
    for table, columns in (("products", ("client_id", "system_id")),
                           ("inventory", ("client_id", "store_id", "system_id", "shelf_id", "shelf_row"))):
        if (table, columns) not in unique_keys:
            problems.append(f"{table}: missing tenant-scoped unique key ({', '.join(columns)})")
    return problems


if __name__ == "__main__":
    from db import get_db_connection
    conn = get_db_connection()
    try:
        issues = check_schema(conn)
    finally:
        conn.close()
    for issue in issues:
        print(issue)
    if not issues:
        print("Schema columns are ready.")
    raise SystemExit(1 if issues else 0)
