# api/product-import.py
import os
import psycopg2
import psycopg2.extras
import json

DATABASE_URL = os.environ.get("DATABASE_URL")


def get_db_connection():
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL not set")
    return psycopg2.connect(DATABASE_URL)


def empty_to_none(value):
    if value is None:
        return None
    s = str(value).strip()
    return s if s else None


# Vercel serverless handler
def handler(request):
    try:
        products_data = json.loads(request.body.decode("utf-8"))
    except Exception:
        return {
            "statusCode": 400,
            "body": json.dumps({
                "status": "error",
                "message": "Invalid JSON payload."
            }),
        }

    if not isinstance(products_data, list) or not products_data:
        return {
            "statusCode": 400,
            "body": json.dumps({
                "status": "error",
                "message": "Payload must be a non-empty list of products."
            }),
        }

    data_to_insert = []
    for item in products_data:
        system_id_value = item.get("system_id")
        if not system_id_value or len(str(system_id_value).strip()) == 0:
            print(f"Skipping row due to empty system_id: {item}")
            continue

        data_to_insert.append((
            system_id_value,
            empty_to_none(item.get("upc")),
            empty_to_none(item.get("custom_sku")),
            empty_to_none(item.get("ean")),
            empty_to_none(item.get("manufacture_sku")),
            item.get("description"),
            item.get("price"),
            item.get("category"),
            item.get("subcat_1"),
            item.get("subcat_2"),
            item.get("subcat_3"),
            item.get("brand")
        ))

    if not data_to_insert:
        return {
            "statusCode": 400,
            "body": json.dumps({
                "status": "error",
                "message": "No valid product rows with a system_id."
            }),
        }

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        sql_upsert = """
            INSERT INTO products (
                system_id, upc_id, custom_sku, ean, manufacture_sku,
                description, price, category, subcat_1, subcat_2, subcat_3, brand
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (system_id) DO UPDATE
            SET 
                upc_id = EXCLUDED.upc_id,
                custom_sku = EXCLUDED.custom_sku,
                ean = EXCLUDED.ean,
                manufacture_sku = EXCLUDED.manufacture_sku,
                description = EXCLUDED.description,
                price = EXCLUDED.price,
                category = EXCLUDED.category,
                subcat_1 = EXCLUDED.subcat_1,
                subcat_2 = EXCLUDED.subcat_2,
                subcat_3 = EXCLUDED.subcat_3,
                brand = EXCLUDED.brand;
        """
        psycopg2.extras.execute_batch(cur, sql_upsert, data_to_insert)
        conn.commit()

        return {
            "statusCode": 200,
            "body": json.dumps({
                "status": "success",
                "message": f"Successfully processed {len(data_to_insert)} valid product records."
            }),
        }

    except Exception as e:
        print(e)
        return {
            "statusCode": 500,
            "body": json.dumps({
                "status": "error",
                "message": str(e)
            }),
        }

    finally:
        if conn:
            conn.close()
