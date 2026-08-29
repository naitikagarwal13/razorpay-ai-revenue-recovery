# Razorpay AI Revenue Recovery

A simple AI-powered dashboard that helps businesses identify failed payments and decide the best way to recover the revenue.

The project shows failed payments, customer information, recovery actions, and an AI-generated recommendation for what to do next.

## Problem

Failed payments can lead to lost revenue.

Businesses often need to manually check why a payment failed, contact the customer, and decide the next recovery step.

This project brings that information together in one dashboard and uses AI to generate a recovery recommendation.

## What the project does

The application allows you to:

- View failed payments
- View customer information
- Track recovery actions
- Analyze failed payments using AI
- Get a suggested recovery strategy
- See the priority of a recovery action
- Generate a personalized message for the customer
- Track whether a recovery action is pending or recovered

## Main Features

### Revenue Recovery Dashboard

The Recovery page gives an overview of payments that require attention.

It shows:

- Revenue at risk
- Number of payments awaiting action
- Recovery coverage
- Payments requiring attention
- AI recovery analysis

### AI Payment Analysis

For a failed payment, the AI generates a structured response containing:

- Failure Interpretation
- Recovery Strategy
- Priority
- Personalized Message
- Suggested Next Action

For example, the AI can suggest asking a customer to retry a payment or use another payment method.

### Payments

The Payments page displays payment information such as:

- Customer
- Amount
- Payment method
- Payment status
- Payment ID

### Customers

The Customers page displays customer information and payment-related details.

### Recovery Actions

Recovery actions are stored in the database so the system can track the next step for each failed payment.

The project also prevents unnecessary duplicate recovery actions for the same payment.

## Tech Stack

### Frontend

- React
- Vite
- CSS

### Backend

- Python
- FastAPI

### Database

- MySQL

### AI

- AI API for payment recovery analysis

## Project Structure

```text
razorpay/
│
├── backend/
│   ├── main.py
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
├── README.md
└── .gitignore
```

## How It Works

The general flow of the application is:

```text
Failed Payment
      ↓
Stored in MySQL
      ↓
Shown on Dashboard
      ↓
AI Analyzes Payment Details
      ↓
Recovery Strategy Generated
      ↓
Recovery Action Saved
```

The backend fetches payment and customer data from MySQL.

When a failed payment is analyzed, the AI receives relevant payment and customer details and generates a structured recovery recommendation.

The result is then displayed on the Recovery dashboard.

## Running the Project

### 1. Clone the repository

```bash
git clone https://github.com/naitikagarwal13/razorpay-ai-revenue-recovery.git
cd razorpay-ai-revenue-recovery
```

### 2. Backend Setup

Create and activate a Python virtual environment if needed.

Install the required Python dependencies.

Make sure your environment variables and MySQL connection details are configured in:

```text
backend/.env
```

Run the backend from the root project folder:

```bash
uvicorn backend.main:app --reload
```

The backend should run on:

```text
http://127.0.0.1:8000
```

### 3. Frontend Setup

Open another terminal and move into the frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the URL shown by Vite in your browser.

## Database

The project uses MySQL to store data related to:

- Users
- Payments
- Recovery actions

The frontend gets its data through the FastAPI backend rather than connecting directly to the database.

## Current Status

The main functionality of the project is working:

- [x] MySQL database integration
- [x] Backend API
- [x] Payments page
- [x] Customers page
- [x] Recovery dashboard
- [x] AI-powered payment analysis
- [x] Recovery action tracking
- [x] Duplicate recovery action prevention
- [x] Frontend and backend integration

## Future Improvements

Some possible improvements include:

- Real-time payment updates
- More payment failure data and analytics
- Automated customer notifications
- Retry payment links
- Better recovery performance analytics
- More advanced AI recommendations

## Author

Naitik Agarwal

## Repository

https://github.com/naitikagarwal13/razorpay-ai-revenue-recovery