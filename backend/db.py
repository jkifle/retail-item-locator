""" # db.py
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST'),
            database=os.getenv('DB_NAME'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASS')
        )
        return conn
    except psycopg2.Error as e:
        print(f"Database connection error: {e}")
        return None """