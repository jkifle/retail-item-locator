# api/test.py
import os
from flask import Flask, jsonify
from flask_cors import CORS
import psycopg2

app = Flask(__name__)
CORS(app)

DATABASE_URL = os.environ.get("DATABASE_URL")

@app.route("/", methods=["GET"])
def handler():
    return jsonify({
        "status": "ok",
        "message": "Vercel Flask API is alive",
        "database_url_set": DATABASE_URL is not None
    })


@app.route("/db", methods=["GET"])
def db_test():
    if not DATABASE_URL:
        return jsonify({
            "status": "error",
            "message": "DATABASE_URL not set"
        }), 500

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("SELECT 1;")
        result = cur.fetchone()
        conn.close()

        return jsonify({
            "status": "ok",
            "db_result": result[0]
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
