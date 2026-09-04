# Razorpay AI Revenue Recovery

A full-stack application for tracking payment activity, identifying failed payments, and managing revenue recovery actions with AI-powered recommendations.

The application brings payments, customers, and recovery workflows into a single dashboard.

---

## Features

### Recovery Dashboard

The Recovery page helps identify payments that require attention.

It includes:

- Revenue at risk
- Payments awaiting action
- Recovery coverage
- Payments requiring attention
- Recovery intelligence for selected payments
- Revenue risk simulation
- Recovery action tracking

Users can select a payment and view its recovery-related information.

---

### AI-Powered Payment Analysis

Failed payments can be analyzed to generate a recovery recommendation.

The AI analysis provides information such as:

- Failure interpretation
- Suggested recovery strategy
- Priority
- Recommended next action
- Personalized recovery message

The application also supports personalized recovery messages in Hinglish.

---

### Recovery Action Tracking

The application stores and tracks recovery actions for payments.

It supports:

- Creating recovery actions
- Tracking pending and recovered actions
- Recovery status updates
- Recovery timeline information
- Prevention of duplicate recovery actions for the same payment

---

### Payments

The Payments page provides an overview of payment activity.

Users can:

- View payment records
- View customer details
- View payment amounts
- View payment methods
- View payment statuses
- View payment IDs
- Search payments
- Filter payments by status
- Filter payments by payment method
- Refresh payment data
- Delete payment records

The page also displays summary metrics for payment activity.

---

### Customers

The Customers page provides a customer-focused view of payment data.

It displays:

- Customer name
- Customer ID
- Email address
- Phone number
- Number of payments
- Total payment value

Users can:

- Search customers
- Refresh customer data
- Select a customer to view related payment activity

The page also displays customer-related summary metrics.

---

### Revenue Risk Simulation

The Recovery dashboard includes a simulation feature that can introduce a new revenue-risk scenario.

This allows the recovery workflow and dashboard metrics to be tested with additional failed-payment data.

---

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

- AI API integration for payment analysis and recovery recommendations

---

## Project Structure

```text
razorpay/
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
├── README.md
└── .gitignore