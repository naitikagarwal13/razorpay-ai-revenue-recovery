import json
from fastapi.middleware.cors import CORSMiddleware
import os
import random
import re
import uuid

import mysql.connector
from mysql.connector import Error

import razorpay
from dotenv import load_dotenv
from fastapi import FastAPI
from groq import Groq


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


# ==============================
# GROQ CONFIGURATION
# ==============================

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

groq_client = Groq(
    api_key=GROQ_API_KEY
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

    cursor = None

    try:

        cursor = connection.cursor(
            dictionary=True
        )

        # Pick a real customer from the existing demo database.
        cursor.execute(
            """
            SELECT id, name
            FROM users
            ORDER BY RAND()
            LIMIT 1
            """
        )

        user = cursor.fetchone()

        if user is None:
            return {
                "status": "error",
                "message": "No customers found in the database"
            }

        payment_methods = [
            "UPI",
            "CARD",
            "NETBANKING",
            "WALLET"
        ]

        amount_options = [
            250.00,
            500.00,
            750.00,
            1200.00,
            1500.00,
            2000.00,
            3500.00
        ]

        payment_method = random.choice(payment_methods)
        amount = random.choice(amount_options)

        failure_reasons = {
            "UPI": [
                "UPI authorization timed out",
                "Bank declined the UPI request",
                "UPI transaction could not be completed"
            ],
            "CARD": [
                "Card issuer declined the transaction",
                "Card authentication failed",
                "Insufficient funds for the transaction"
            ],
            "NETBANKING": [
                "Bank authentication failed",
                "Banking session timed out",
                "Transaction declined by the bank"
            ],
            "WALLET": [
                "Wallet service was temporarily unavailable",
                "Wallet authorization failed",
                "Wallet balance could not be verified"
            ]
        }

        failure_reason = random.choice(
            failure_reasons[payment_method]
        )

        razorpay_payment_id = (
            f"pay_demo_{uuid.uuid4().hex[:12]}"
        )

        razorpay_order_id = (
            f"order_demo_{uuid.uuid4().hex[:12]}"
        )

        # 1. DETECT: create a new failed payment event.
        cursor.execute(
            """
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
            """,
            (
                razorpay_payment_id,
                razorpay_order_id,
                user["id"],
                amount,
                "failed",
                payment_method
            )
        )

        payment_id = cursor.lastrowid

        # 2. DECIDE: create a bounded initial recovery recommendation.
        if payment_method == "CARD":
            action_type = "PAYMENT_RETRY"
            next_action = (
                "Ask the customer to retry once. "
                "If it fails again, offer UPI."
            )
        elif payment_method == "UPI":
            action_type = "PAYMENT_RETRY"
            next_action = (
                "Ask the customer to retry the UPI payment "
                "or use a different UPI app."
            )
        else:
            action_type = "ALTERNATIVE_METHOD"
            next_action = (
                "Offer the customer an alternative "
                "payment method."
            )

        priority = (
            "HIGH" if amount >= 1500
            else "MEDIUM"
        )

        agent_message = f"""Failure Interpretation:
{failure_reason}.

Recommended Strategy:
{next_action}

Priority:
{priority}

Personalized Message:
Hi {user["name"]}, your ₹{amount:.2f} payment could not be completed. Please retry the payment. If the issue continues, choose another available payment method.

Suggested Next Action:
{action_type}"""

        # 3. CREATE RECOVERY WORKFLOW: the event enters the queue immediately.
        cursor.execute(
            """
            INSERT INTO recovery_actions
            (
                payment_id,
                action_type,
                message,
                status
            )
            VALUES (%s, %s, %s, %s)
            """,
            (
                payment_id,
                action_type,
                agent_message,
                "pending"
            )
        )

        recovery_action_id = cursor.lastrowid

        connection.commit()

        return {
            "status": "success",
            "message": "Revenue risk event simulated successfully",
            "payment": {
                "payment_id": payment_id,
                "customer_name": user["name"],
                "amount": float(amount),
                "payment_method": payment_method,
                "status": "failed",
                "failure_reason": failure_reason,
                "priority": priority
            },
            "recovery_action_id": recovery_action_id
        }

    except Error as e:

        if connection:
            connection.rollback()

        return {
            "status": "error",
            "message": str(e)
        }

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


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

    cursor = None

    try:

        cursor = connection.cursor(
            dictionary=True
        )

        # Find the payment linked to this recovery action
        cursor.execute(
            """
            SELECT payment_id
            FROM recovery_actions
            WHERE id = %s
            """,
            (action_id,)
        )

        action = cursor.fetchone()

        if action is None:
            return {
                "status": "error",
                "message": "Recovery action not found"
            }

        payment_id = action["payment_id"]

        # Update the recovery action itself
        cursor.execute(
            """
            UPDATE recovery_actions
            SET status = %s
            WHERE id = %s
            """,
            (
                status,
                action_id
            )
        )

        # Keep the payment record in sync when recovery is complete
        if status in ["recovered", "resolved"]:

            cursor.execute(
                """
                UPDATE payments
                SET status = 'recovered'
                WHERE id = %s
                """,
                (payment_id,)
            )

        connection.commit()

        return {
            "status": "success",
            "message": "Recovery action updated successfully",
            "action_id": action_id,
            "payment_id": payment_id,
            "new_status": status
        }

    except Error as e:

        connection.rollback()

        return {
            "status": "error",
            "message": str(e)
        }

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================
# AI RECOVERY ANALYSIS
# =========================

@app.post("/ai-analyze/{payment_id}")
def ai_analyze_payment(payment_id: int):

    connection = get_db_connection()

    if connection is None:
        return {
            "status": "error",
            "message": "Could not connect to MySQL"
        }

    cursor = None

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

        if payment is None:
            return {
                "status": "error",
                "message": "Failed payment not found"
            }

        history_query = """
        SELECT
            COUNT(*) AS total_payments,
            COALESCE(SUM(status = 'failed'), 0) AS failed_payments,
            COALESCE(SUM(status = 'recovered'), 0) AS recovered_payments
        FROM payments
        WHERE user_id = %s
        """

        cursor.execute(
            history_query,
            (payment["user_id"],)
        )

        customer_history = cursor.fetchone() or {}

    except Error as e:

        return {
            "status": "error",
            "message": str(e)
        }

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()

    amount = float(payment["amount"] or 0)
    customer_name = payment["name"] or "Customer"
    method = (payment["payment_method"] or "UNKNOWN").upper()

    total_payments = int(
        customer_history.get("total_payments") or 0
    )
    failed_payments = int(
        customer_history.get("failed_payments") or 0
    )
    recovered_payments = int(
        customer_history.get("recovered_payments") or 0
    )

    method_contexts = {
        "CARD": (
            "The exact cause is unavailable. A card failure can be "
            "related to issuer approval, authentication, balance, or "
            "temporary processing issues."
        ),
        "UPI": (
            "The exact cause is unavailable. A UPI failure can be "
            "related to bank availability, authorization, limits, "
            "balance, or network issues."
        ),
        "NETBANKING": (
            "The exact cause is unavailable. A netbanking failure can "
            "be related to authentication, session expiry, or bank "
            "processing issues."
        ),
        "WALLET": (
            "The exact cause is unavailable. A wallet failure can be "
            "related to balance, authorization, or temporary provider "
            "issues."
        )
    }

    method_context = method_contexts.get(
        method,
        "The exact failure cause is unavailable."
    )

    if amount >= 5000:
        priority_baseline = "HIGH"
    elif amount >= 1500:
        priority_baseline = "MEDIUM"
    else:
        priority_baseline = "LOW"

    prompt = f"""
You are a payment recovery operations assistant.

Analyze this ONE failed payment:

Customer: {customer_name}
Amount: ₹{amount:.2f}
Payment method: {method}
Status: {payment["status"]}

Customer history:
Total payments: {total_payments}
Failed payments: {failed_payments}
Recovered payments: {recovered_payments}

Context:
{method_context}

Priority baseline: {priority_baseline}

Return exactly these five headings, followed by plain text:

Failure Interpretation:
Recovery Strategy:
Priority:
Personalized Message:
Suggested Next Action:

Rules:
Each section must be concise and directly useful.
Failure Interpretation: maximum 2 short sentences.
Recovery Strategy: maximum 2 short sentences.
Priority: exactly LOW, MEDIUM, or HIGH.
Personalized Message: one short natural message.
Suggested Next Action: exactly one concrete action.

Never use *, **, -, bullets, markdown, JSON, code fences,
instruction text, drafts, or explanations of your reasoning.
Do not invent an exact failure cause.
"""

    try:

        completion = groq_client.chat.completions.create(
            model="qwen/qwen3.6-27b",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Give concise customer-payment recovery output. "
                        "Follow the five requested headings exactly. "
                        "Never output markdown bullets or commentary."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.1,
            max_tokens=300
        )

        raw_response = (
            completion.choices[0].message.content or ""
        ).strip()

        if not raw_response:
            raise Exception(
                "Groq returned an empty response"
            )

        def get_section(response_text, heading):
            marker = heading + ":"
            start_index = response_text.lower().find(
                marker.lower()
            )

            if start_index == -1:
                return ""

            start_index += len(marker)
            end_index = len(response_text)

            headings = [
                "Failure Interpretation:",
                "Recovery Strategy:",
                "Priority:",
                "Personalized Message:",
                "Suggested Next Action:"
            ]

            for next_heading in headings:
                if next_heading.lower() == marker.lower():
                    continue

                position = response_text.lower().find(
                    next_heading.lower(),
                    start_index
                )

                if position != -1 and position < end_index:
                    end_index = position

            return response_text[
                start_index:end_index
            ].strip()

        def clean_ai_text(value):
            if not value:
                return ""

            lines = value.splitlines()
            cleaned_lines = []

            for line in lines:
                line = line.strip()

                # Remove markdown bullets and decoration.
                line = re.sub(
                    r"^[*•#]+\s*",
                    "",
                    line
                )
                line = re.sub(
                    r"^-+\s*",
                    "",
                    line
                )

                # Remove markdown emphasis and code markers.
                line = line.replace("**", "")
                line = line.replace("`", "")
                line = line.strip()

                # Ignore empty or decoration-only lines.
                if not line or line in {"-", "*", "•"}:
                    continue

                cleaned_lines.append(line)

            result = " ".join(cleaned_lines)

            # Remove accidental leftover punctuation from formatting.
            result = re.sub(r"\s+", " ", result)
            result = re.sub(r"\s+-\s*$", "", result)
            result = result.strip(" -*•\n\t")

            return result

        failure_interpretation = clean_ai_text(
            get_section(
                raw_response,
                "Failure Interpretation"
            )
        )

        recovery_strategy = clean_ai_text(
            get_section(
                raw_response,
                "Recovery Strategy"
            )
        )

        priority = clean_ai_text(
            get_section(
                raw_response,
                "Priority"
            )
        ).upper()

        personalized_message = clean_ai_text(
            get_section(
                raw_response,
                "Personalized Message"
            )
        )

        suggested_next_action = clean_ai_text(
            get_section(
                raw_response,
                "Suggested Next Action"
            )
        )

        # Priority must always be exactly one valid word.
        priority_match = re.search(
            r"\b(LOW|MEDIUM|HIGH)\b",
            priority
        )

        if priority_match:
            priority = priority_match.group(1)
        else:
            priority = priority_baseline

        if not failure_interpretation:
            failure_interpretation = (
                "The exact cause is not available. The payment may "
                "have been affected by a temporary processing or "
                "authorization issue."
            )

        if not recovery_strategy:
            recovery_strategy = (
                "Ask the customer to retry once. If it fails again, "
                "offer another payment method."
            )

        if not personalized_message:
            personalized_message = (
                f"Hi {customer_name}, your ₹{amount:.2f} payment "
                "could not be completed. Please try again or choose "
                "another payment method."
            )

        if not suggested_next_action:
            suggested_next_action = (
                "Send a payment retry notification."
            )

        # Groq can occasionally echo prompt instructions instead of a
        # payment analysis. Never pass leaked instructions to the UI.
        suspicious_patterns = [
            "analyze user input",
            "thinking process",
            "key points to include",
            "mental refinement",
            "section by section",
            "return only",
            "output format",
            "do not invent",
            "no markdown",
            "rules:"
        ]

        combined_analysis = " ".join([
            failure_interpretation,
            recovery_strategy,
            personalized_message,
            suggested_next_action
        ]).lower()

        if any(
            pattern in combined_analysis
            for pattern in suspicious_patterns
        ):
            failure_interpretation = (
                "The exact cause is not available. The payment may "
                "have encountered a temporary processing or "
                "authorization issue."
            )
            recovery_strategy = (
                "Ask the customer to retry once. If the problem "
                "continues, offer another payment method."
            )
            personalized_message = (
                f"Hi {customer_name}, your ₹{amount:.2f} payment "
                "could not be completed. Please try again or choose "
                "another payment method."
            )
            suggested_next_action = (
                "Send a payment retry notification."
            )

        structured_analysis = {
            "failure_interpretation": failure_interpretation,
            "recovery_strategy": recovery_strategy,
            "priority": priority,
            "personalized_message": personalized_message,
            "suggested_next_action": suggested_next_action
        }

        ai_analysis = f"""Failure Interpretation:
{failure_interpretation}

Recovery Strategy:
{recovery_strategy}

Priority:
{priority}

Personalized Message:
{personalized_message}

Suggested Next Action:
{suggested_next_action}"""

        saved = save_recovery_action(
            payment_id=payment_id,
            action_type="AI_RECOVERY",
            message=ai_analysis
        )

        return {
            "status": "success",
            "payment_id": payment_id,
            "analysis": structured_analysis,
            "ai_analysis": ai_analysis,
            "source": "Groq",
            "recovery_action_saved": saved
        }

    except Exception as e:

        print(
            "Groq AI Error:",
            str(e)
        )

        return {
            "status": "error",
            "message": (
                "Could not generate AI analysis with Groq: "
                + str(e)
            )
        }


# =========================
# HINGLISH RECOVERY MESSAGE
# =========================

@app.post("/ai-analyze-hinglish/{payment_id}")
def ai_analyze_hinglish(payment_id: int):

    connection = get_db_connection()

    if connection is None:
        return {
            "status": "error",
            "message": "Could not connect to MySQL"
        }

    cursor = None

    try:
        cursor = connection.cursor(dictionary=True)

        query = """
        SELECT
            payments.id AS payment_id,
            payments.amount,
            payments.status,
            payments.payment_method,
            users.name,
            users.email
        FROM payments
        LEFT JOIN users
            ON payments.user_id = users.id
        WHERE payments.id = %s
        AND payments.status = 'failed'
        """

        cursor.execute(query, (payment_id,))

        payment = cursor.fetchone()

        if payment is None:
            return {
                "status": "error",
                "message": "Failed payment not found"
            }

    except Error as e:
        return {
            "status": "error",
            "message": str(e)
        }

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()

    amount = float(payment["amount"] or 0)

    customer_name = payment["name"] or "Customer"

    method = (
        payment["payment_method"] or "payment"
    ).upper()

    default_message = (
        f"Hi {customer_name}, aapka ₹{amount:.2f} "
        f"{method.lower()} payment complete nahi ho paya. "
        "Please ek baar phir try karein. Agar issue continue ho, "
        "toh koi dusra payment method use kar sakte hain."
    )

    prompt = f"""
Generate a final customer-facing payment recovery message.

Customer name: {customer_name}
Amount: ₹{amount:.2f}
Payment method: {method}
Payment status: failed

Write exactly ONE short message in natural Indian Hinglish
using English letters.

The message should:
- Be friendly and professional.
- Say the payment could not be completed.
- Ask the customer to try again.
- Suggest another payment method if the issue continues.
- Not invent a reason for the failure.

IMPORTANT:
Your response must contain ONLY the final customer message.
Do not explain your reasoning.
Do not describe your instructions.
Do not include a thinking process.
Do not use markdown.
Do not use headings or bullet points.
"""

    try:

        completion = groq_client.chat.completions.create(
            model="qwen/qwen3.6-27b",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Return only the final customer-facing "
                        "Hinglish message. Never reveal reasoning, "
                        "thinking, analysis, instructions, or prompts."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,
            max_tokens=100
        )

        hinglish_message = (
            completion.choices[0].message.content or ""
        ).strip()

        # If the model accidentally returns reasoning/instructions,
        # use our reliable fallback instead.
        bad_patterns = [
            "thinking process",
            "analyze user input",
            "customer name:",
            "key points to include",
            "language:",
            "tone:",
            "payment status:",
            "here's a"
        ]

        message_lower = hinglish_message.lower()

        if (
            not hinglish_message
            or any(
                pattern in message_lower
                for pattern in bad_patterns
            )
        ):
            hinglish_message = default_message
            source = "Fallback"

        else:
            # Remove accidental quotes or markdown characters
            hinglish_message = hinglish_message.strip(
                " \n\t\"'`*#"
            )

            source = "Groq"

        return {
            "status": "success",
            "payment_id": payment_id,
            "hinglish_message": hinglish_message,
            "source": source
        }

    except Exception as e:

        print(
            "Groq Hinglish Error:",
            str(e)
        )

        return {
            "status": "success",
            "payment_id": payment_id,
            "hinglish_message": default_message,
            "source": "Fallback"
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

    # =========================
# DELETE PAYMENT
# =========================

@app.delete("/payments/{payment_id}")
def delete_payment(payment_id: int):

    connection = get_db_connection()

    if connection is None:
        return {
            "status": "error",
            "message": "Could not connect to MySQL"
        }

    cursor = None

    try:

        cursor = connection.cursor()

        # First check that the payment exists
        cursor.execute(
            """
            SELECT id
            FROM payments
            WHERE id = %s
            """,
            (payment_id,)
        )

        payment = cursor.fetchone()

        if payment is None:
            return {
                "status": "error",
                "message": "Payment not found"
            }

        # Delete recovery actions linked to this payment first
        cursor.execute(
            """
            DELETE FROM recovery_actions
            WHERE payment_id = %s
            """,
            (payment_id,)
        )

        # Delete the payment itself
        cursor.execute(
            """
            DELETE FROM payments
            WHERE id = %s
            """,
            (payment_id,)
        )

        connection.commit()

        return {
            "status": "success",
            "message": "Payment deleted successfully",
            "payment_id": payment_id
        }

    except Error as e:

        connection.rollback()

        return {
            "status": "error",
            "message": str(e)
        }

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()

# =========================
# RECOVERY METRICS
# =========================

@app.get("/recovery-metrics")
def get_recovery_metrics():

    connection = get_db_connection()

    if connection is None:
        return {
            "status": "error",
            "message": "Could not connect to MySQL"
        }

    cursor = None

    try:

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
    """
    SELECT
        COALESCE(
            SUM(
                CASE
                    WHEN ra.status IN ('pending', 'contacted')
                    THEN p.amount
                    ELSE 0
                END
            ),
            0
        ) AS revenue_at_risk,

        COALESCE(
            SUM(
                CASE
                    WHEN ra.status IN ('recovered', 'resolved')
                    THEN p.amount
                    ELSE 0
                END
            ),
            0
        ) AS revenue_recovered,

        COALESCE(
            SUM(
                CASE
                    WHEN ra.status IN (
                        'pending',
                        'contacted',
                        'recovered',
                        'resolved'
                    )
                    THEN p.amount
                    ELSE 0
                END
            ),
            0
        ) AS recovery_eligible_revenue,

        COALESCE(
            SUM(
                CASE
                    WHEN ra.status IN ('recovered', 'resolved')
                    THEN 1
                    ELSE 0
                END
            ),
            0
        ) AS recovered_payments,

        COALESCE(
            SUM(
                CASE
                    WHEN ra.status IN ('pending', 'contacted')
                    THEN 1
                    ELSE 0
                END
            ),
            0
        ) AS failed_payments

    FROM payments p

    INNER JOIN recovery_actions ra
        ON p.id = ra.payment_id
    """
)


        payment_metrics = cursor.fetchone()

        cursor.execute(
            """
            SELECT COUNT(*) AS pending_recovery
            FROM recovery_actions
            WHERE status IN ('pending', 'contacted')
            """
        )

        pending_metrics = cursor.fetchone()

        revenue_at_risk = float(
            payment_metrics["revenue_at_risk"] or 0
        )
        revenue_recovered = float(
            payment_metrics["revenue_recovered"] or 0
        )
        eligible_revenue = float(
            payment_metrics["recovery_eligible_revenue"] or 0
        )

        recovery_rate = (
            round(
                (revenue_recovered / eligible_revenue) * 100,
                1
            )
            if eligible_revenue > 0
            else 0
        )

        return {
            "status": "success",
            "metrics": {
                "revenue_at_risk": revenue_at_risk,
                "revenue_recovered": revenue_recovered,
                "recovery_rate": recovery_rate,
                "pending_recovery": int(
                    pending_metrics["pending_recovery"] or 0
                ),
                "failed_payments": int(
                    payment_metrics["failed_payments"] or 0
                ),
                "recovered_payments": int(
                    payment_metrics["recovered_payments"] or 0
                )
            }
        }

    except Error as e:

        return {
            "status": "error",
            "message": str(e)
        }

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================
# PAYMENT RECOVERY TIMELINE
# =========================

@app.get("/recovery-timeline/{payment_id}")
def get_recovery_timeline(payment_id: int):

    connection = get_db_connection()

    if connection is None:
        return {
            "status": "error",
            "message": "Could not connect to MySQL"
        }

    cursor = None

    try:

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT
                id,
                status,
                amount,
                payment_method,
                created_at
            FROM payments
            WHERE id = %s
            """,
            (payment_id,)
        )

        payment = cursor.fetchone()

        if payment is None:
            return {
                "status": "error",
                "message": "Payment not found"
            }

        cursor.execute(
            """
            SELECT
                id,
                action_type,
                status,
                created_at
            FROM recovery_actions
            WHERE payment_id = %s
            ORDER BY created_at ASC
            """,
            (payment_id,)
        )

        actions = cursor.fetchall()

        timeline = [
            {
                "stage": "DETECTED",
                "title": "Payment failure detected",
                "detail": (
                    f"₹{float(payment['amount']):.2f} "
                    f"{payment['payment_method']} payment entered "
                    f"the revenue recovery workflow."
                ),
                "time": payment["created_at"]
            }
        ]

        for action in actions:
            timeline.append(
                {
                    "stage": "DECIDED",
                    "title": "Recovery strategy created",
                    "detail": (
                        f"Agent selected "
                        f"{action['action_type']}."
                    ),
                    "time": action["created_at"]
                }
            )

            if action["status"] == "contacted":
                timeline.append(
                    {
                        "stage": "EXECUTED",
                        "title": "Recovery action executed",
                        "detail": (
                            "Customer recovery workflow "
                            "was initiated."
                        ),
                        "time": action["created_at"]
                    }
                )

            if action["status"] in ["recovered", "resolved"]:
                timeline.append(
                    {
                        "stage": "RECOVERED",
                        "title": "Revenue recovered",
                        "detail": (
                            f"₹{float(payment['amount']):.2f} "
                            "was successfully recovered."
                        ),
                        "time": action["created_at"]
                    }
                )

        return {
            "status": "success",
            "payment_id": payment_id,
            "timeline": timeline
        }

    except Error as e:

        return {
            "status": "error",
            "message": str(e)
        }

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()
