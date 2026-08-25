import os

import mysql.connector
from mysql.connector import Error

import razorpay
from dotenv import load_dotenv

from fastapi import FastAPI


# Load variables from .env
load_dotenv()


# =========================
# FastAPI
# =========================

app = FastAPI(
    title="Razorpay AI",
    description="AI-powered revenue recovery platform",
    version="1.0.0"
)


# =========================
# MySQL Configuration
# =========================

DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 3306,
    "user": "root",
    "password": "Naitik231913",
    "database": "razorpay_ai"
}


# =========================
# Razorpay Configuration
# =========================

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")

razorpay_client = razorpay.Client(
    auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
)


# =========================
# Database Connection
# =========================

def get_db_connection():
    try:
        connection = mysql.connector.connect(**DB_CONFIG)

        if connection.is_connected():
            return connection

    except Error as e:
        print(f"MySQL connection error: {e}")

    return None


# =========================
# Root
# =========================

@app.get("/")
def root():
    return {
        "message": "Razorpay AI backend is running"
    }


# =========================
# Health Check
# =========================

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


# =========================
# Database Test
# =========================

@app.get("/db-test")
def db_test():
    connection = get_db_connection()

    if connection is None:
        return {
            "status": "error",
            "message": "Could not connect to MySQL"
        }

    try:
        cursor = connection.cursor()

        cursor.execute("SELECT DATABASE();")
        database = cursor.fetchone()[0]

        cursor.close()
        connection.close()

        return {
            "status": "connected",
            "database": database
        }

    except Error as e:
        return {
            "status": "error",
            "message": str(e)
        }


# =========================
# Razorpay API Test
# =========================

@app.get("/razorpay-test")
def razorpay_test():
    try:
        orders = razorpay_client.order.all()

        return {
            "status": "connected",
            "message": "Razorpay Test API is working",
            "orders_count": len(orders.get("items", []))
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


# =========================
# Create Razorpay Test Order
# =========================

@app.post("/create-order")
def create_order():
    try:
        order_data = {
            "amount": 50000,
            "currency": "INR",
            "receipt": "test_receipt_001"
        }

        order = razorpay_client.order.create(
            data=order_data
        )

        return {
            "status": "success",
            "order": order
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


# =========================
# Simulate Failed Payment
# =========================

@app.post("/simulate-failed-payment")
def simulate_failed_payment():
    connection = get_db_connection()

    if connection is None:
        return {
            "status": "error",
            "message": "Could not connect to MySQL"
        }

    try:
        cursor = connection.cursor()

        query = """
        INSERT INTO payments
        (
            razorpay_payment_id,
            razorpay_order_id,
            user_id,
            amount,
            status,
            payment_method
        )
        VALUES (%s, %s, %s, %s, %s, %s)
        """

        values = (
            "pay_demo_failed_001",
            "order_TU4HHuadGnIEab",
            1,
            500.00,
            "failed",
            "UPI"
        )

        cursor.execute(query, values)
        connection.commit()

        payment_id = cursor.lastrowid

        cursor.close()
        connection.close()

        return {
            "status": "success",
            "message": "Failed payment simulated and stored",
            "payment_id": payment_id
        }

    except Error as e:
        if connection:
            connection.close()

        return {
            "status": "error",
            "message": str(e)
        }


# =========================
# Get Failed Payment Details
# =========================

@app.get("/failed-payment/{payment_id}")
def get_failed_payment(payment_id: int):
    connection = get_db_connection()

    if connection is None:
        return {
            "status": "error",
            "message": "Could not connect to MySQL"
        }

    try:
        cursor = connection.cursor(dictionary=True)

        query = """
        SELECT
            payments.id AS payment_id,
            payments.razorpay_payment_id,
            payments.razorpay_order_id,
            payments.amount,
            payments.status,
            payments.payment_method,
            payments.created_at,
            users.id AS user_id,
            users.name,
            users.email,
            users.phone
        FROM payments
        LEFT JOIN users
            ON payments.user_id = users.id
        WHERE payments.id = %s
        AND payments.status = 'failed'
        """

        cursor.execute(query, (payment_id,))
        payment = cursor.fetchone()

        cursor.close()
        connection.close()

        if payment is None:
            return {
                "status": "error",
                "message": "Failed payment not found"
            }

        return {
            "status": "success",
            "payment": payment
        }

    except Error as e:
        if connection:
            connection.close()

        return {
            "status": "error",
            "message": str(e)
        }