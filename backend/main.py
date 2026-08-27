from fastapi.middleware.cors import CORSMiddleware
import os

import mysql.connector
from mysql.connector import Error

import razorpay
from dotenv import load_dotenv
from fastapi import FastAPI
from openai import OpenAI


# =========================
# ENVIRONMENT CONFIGURATION
# =========================

ENV_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    ".env"
)

load_dotenv(ENV_PATH, override=True)


# =========================
# FASTAPI
# =========================

app = FastAPI(
    title="Razorpay AI",
    description="AI-powered revenue recovery platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# DATABASE CONFIGURATION
# =========================

DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 3306,
    "user": "root",
    "password": os.getenv("MYSQL_PASSWORD"),
    "database": "razorpay_ai"
}


# =========================
# RAZORPAY CONFIGURATION
# =========================

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")

razorpay_client = razorpay.Client(
    auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
)


# =========================
# OPENAI CONFIGURATION
# =========================

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

openai_client = OpenAI(
    api_key=OPENAI_API_KEY
)


# =========================
# DATABASE CONNECTION
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
# SAVE RECOVERY ACTION
# =========================

def save_recovery_action(payment_id, action_type, message):

    connection = get_db_connection()

    if connection is None:
        print("Could not connect to MySQL while saving recovery action")
        return False

    try:
        cursor = connection.cursor()

        # Check whether this payment already has a recovery action
        check_query = """
        SELECT id
        FROM recovery_actions
        WHERE payment_id = %s
        ORDER BY id DESC
        LIMIT 1
        """

        cursor.execute(
            check_query,
            (payment_id,)
        )

        existing_action = cursor.fetchone()

        if existing_action:

            # Update the existing action instead of creating a duplicate
            update_query = """
            UPDATE recovery_actions
            SET
                action_type = %s,
                message = %s
            WHERE id = %s
            """

            cursor.execute(
                update_query,
                (
                    action_type,
                    message,
                    existing_action[0]
                )
            )

        else:

            # Create a new action only if none exists
            insert_query = """
            INSERT INTO recovery_actions
            (
                payment_id,
                action_type,
                message
            )
            VALUES (%s, %s, %s)
            """

            cursor.execute(
                insert_query,
                (
                    payment_id,
                    action_type,
                    message
                )
            )

        connection.commit()

        cursor.close()
        connection.close()

        return True

    except Error as e:

        print(f"Recovery action error: {e}")

        if connection:
            connection.close()

        return False

# =========================
# BASIC ENDPOINTS
# =========================

@app.get("/")
def root():

    return {
        "message": "Razorpay AI backend is running"
    }


@app.get("/health")
def health():

    return {
        "status": "healthy"
    }


# =========================
# DATABASE TEST
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
# RAZORPAY TEST
# =========================

@app.get("/razorpay-test")
def razorpay_test():

    try:

        orders = razorpay_client.order.all()

        return {
            "status": "connected",
            "message": "Razorpay Test API is working",
            "orders_count": len(
                orders.get("items", [])
            )
        }

    except Exception as e:

        return {
            "status": "error",
            "message": str(e)
        }


# =========================
# CREATE RAZORPAY ORDER
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
# SIMULATE FAILED PAYMENT
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

        cursor.execute(
            query,
            values
        )

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
# GET FAILED PAYMENT
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

        cursor = connection.cursor(
            dictionary=True
        )

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

        cursor.execute(
            query,
            (payment_id,)
        )

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


# =========================
# GET RECOVERY ACTIONS
# =========================

@app.get("/recovery-actions")
def get_recovery_actions():

    connection = get_db_connection()

    if connection is None:
        return {
            "status": "error",
            "message": "Could not connect to MySQL"
        }

    try:

        cursor = connection.cursor(
            dictionary=True
        )

        query = """
        SELECT
            recovery_actions.id,
            recovery_actions.payment_id,
            recovery_actions.action_type,
            recovery_actions.message,
            recovery_actions.status,
            recovery_actions.created_at,
            payments.amount,
            payments.payment_method,
            users.name,
            users.email
        FROM recovery_actions
        LEFT JOIN payments
            ON recovery_actions.payment_id = payments.id
        LEFT JOIN users
            ON payments.user_id = users.id
        ORDER BY recovery_actions.created_at DESC
        """

        cursor.execute(query)

        actions = cursor.fetchall()

        cursor.close()
        connection.close()

        return {
            "status": "success",
            "count": len(actions),
            "recovery_actions": actions
        }

    except Error as e:

        if connection:
            connection.close()

        return {
            "status": "error",
            "message": str(e)
        }


# =========================
# UPDATE RECOVERY ACTION STATUS
# =========================

@app.put("/recovery-actions/{action_id}/status")
def update_recovery_action_status(
    action_id: int,
    status: str
):

    allowed_statuses = [
        "pending",
        "contacted",
        "recovered",
        "resolved"
    ]

    if status not in allowed_statuses:
        return {
            "status": "error",
            "message": "Invalid status"
        }

    connection = get_db_connection()

    if connection is None:
        return {
            "status": "error",
            "message": "Could not connect to MySQL"
        }

    try:

        cursor = connection.cursor()

        query = """
        UPDATE recovery_actions
        SET status = %s
        WHERE id = %s
        """

        cursor.execute(
            query,
            (
                status,
                action_id
            )
        )

        connection.commit()

        rows_updated = cursor.rowcount

        cursor.close()
        connection.close()

        if rows_updated == 0:
            return {
                "status": "error",
                "message": "Recovery action not found"
            }

        return {
            "status": "success",
            "message": "Recovery action updated successfully",
            "action_id": action_id,
            "new_status": status
        }

    except Error as e:

        if connection:
            connection.close()

        return {
            "status": "error",
            "message": str(e)
        }


# =========================
# AI RECOVERY ANALYSIS
# =========================

@app.post("/ai-analyze/{payment_id}")
def ai_analyze_payment(payment_id: int):

    # ---------------------------------
    # Get payment + customer information
    # ---------------------------------

    connection = get_db_connection()

    if connection is None:
        return {
            "status": "error",
            "message": "Could not connect to MySQL"
        }

    try:

        cursor = connection.cursor(
            dictionary=True
        )

        query = """
        SELECT
            payments.id AS payment_id,
            payments.amount,
            payments.status,
            payments.payment_method,
            payments.razorpay_payment_id,
            payments.razorpay_order_id,
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

        cursor.execute(
            query,
            (payment_id,)
        )

        payment = cursor.fetchone()

        cursor.close()
        connection.close()

    except Error as e:

        if connection:
            connection.close()

        return {
            "status": "error",
            "message": str(e)
        }

    # ---------------------------------
    # Check payment exists
    # ---------------------------------

    if payment is None:

        return {
            "status": "error",
            "message": "Failed payment not found"
        }

    # ---------------------------------
    # AI prompt
    # ---------------------------------

    prompt = f"""
You are an intelligent revenue recovery agent for a payment platform.

Analyze the failed payment below and provide a specific, practical recovery recommendation.

PAYMENT DETAILS:
- Customer Name: {payment["name"]}
- Customer Email: {payment["email"]}
- Payment Amount: ₹{payment["amount"]}
- Payment Method: {payment["payment_method"]}
- Payment Status: {payment["status"]}

Your response must be based on the payment details provided.

Provide the response in exactly these sections:

Failure Interpretation:
Briefly explain why this payment may have failed. Do not claim to know the exact reason unless it is provided. Mention realistic possibilities relevant to the payment method.

Recommended Strategy:
Give the best immediate recovery strategy. Make the recommendation specific to the payment method and amount.

Priority:
Choose exactly one: LOW, MEDIUM, or HIGH.
Consider the payment amount when deciding the priority.

Personalized Message:
Write a short, professional message addressed directly to the customer. Mention the customer's name and payment amount. Suggest a suitable retry or alternative payment method.

Suggested Next Action:
Give one clear action that the business should take next.

IMPORTANT:
- Do not repeat the same sentence across sections.
- Do not give generic advice without explaining it.
- If retrying the same payment method may fail again, suggest a suitable alternative.
- Keep the response concise and useful for a payment recovery agent.
"""

    # ---------------------------------
    # Try OpenAI
    # ---------------------------------

    try:

        response = openai_client.responses.create(
            model="gpt-5-mini",
            input=prompt
        )

        ai_result = response.output_text

        saved = save_recovery_action(
            payment_id=payment_id,
            action_type="AI_RECOVERY",
            message=ai_result
        )

        return {
            "status": "success",
            "payment_id": payment_id,
            "ai_analysis": ai_result,
            "source": "OpenAI",
            "recovery_action_saved": saved
        }

    # ---------------------------------
    # Local fallback
    # ---------------------------------

    except Exception as e:

        ai_result = f"""
Failure Interpretation:
The ₹{payment["amount"]} {payment["payment_method"]} payment
failed and the transaction was not completed.

Recovery Strategy:
Ask the customer to retry the payment using
{payment["payment_method"]}. If the retry fails, provide an
alternative payment method.

Priority:
High

Personalized Message:
Hi {payment["name"]}, your ₹{payment["amount"]} payment could not
be completed. Please try the payment again. If the issue
continues, you can use another payment method.

Suggested Next Action:
Send the customer a payment retry message and provide a retry
payment option.
"""

        saved = save_recovery_action(
            payment_id=payment_id,
            action_type="PAYMENT_RETRY",
            message=ai_result
        )

        return {
            "status": "success",
            "payment_id": payment_id,
            "ai_analysis": ai_result,
            "source": "Local Recovery Agent",
            "recovery_action_saved": saved
        }


# =========================
# GET ALL PAYMENTS
# =========================

@app.get("/payments")
def get_payments():

    connection = get_db_connection()

    if connection is None:
        return {
            "status": "error",
            "message": "Could not connect to MySQL"
        }

    try:

        cursor = connection.cursor(
            dictionary=True
        )

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
        ORDER BY payments.created_at DESC
        """

        cursor.execute(query)

        payments = cursor.fetchall()

        cursor.close()
        connection.close()

        return {
            "status": "success",
            "count": len(payments),
            "payments": payments
        }

    except Error as e:

        if connection:
            connection.close()

        return {
            "status": "error",
            "message": str(e)
        }