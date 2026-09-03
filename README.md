# Razorpay AI Revenue Recovery

An AI-powered payment recovery dashboard that helps businesses identify failed payments, understand revenue at risk, and determine appropriate recovery strategies.

The application combines payment data, customer information, recovery actions, and AI-generated recommendations in one dashboard.

---

## Problem Statement

Failed payments can lead to lost revenue.

Businesses often need to manually identify failed transactions, understand the reason for failure, contact customers, and decide the next recovery step.

Razorpay AI Revenue Recovery brings these processes together and provides AI-powered recovery recommendations.

---

## Features

### Revenue Recovery Dashboard

The Recovery dashboard provides an overview of payments requiring attention.

It includes:

- Revenue at risk
- Payments awaiting recovery action
- Recovery coverage
- Recovery metrics
- Payments requiring attention
- AI-powered recovery analysis
- Revenue risk simulation

### AI Payment Analysis

For failed payments, the system generates a structured recovery recommendation that can include:

- Failure interpretation
- Recovery strategy
- Priority
- Personalized customer message
- Suggested next action

### Payments Management

The Payments page allows users to:

- View payment information
- Search payments
- Filter payments by status
- Filter payments by payment method
- Track successful and failed payments
- Refresh payment data
- Delete payments

Payment information includes:

- Customer
- Amount
- Payment method
- Payment status
- Payment ID

### Customer Directory

The Customers page provides a customer-focused view of payment information.

It includes:

- Total customers
- Total payments
- Customer value
- Customer name
- Email
- Phone number
- Payment count
- Total payment value
- Customer ID
- Customer search
- Data refresh

### Recovery Actions

Recovery actions are stored in the database to track the next step for failed payments.

The system also prevents unnecessary duplicate recovery actions for the same payment.

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

- AI API for payment recovery analysis

---

## Project Structure

```text
razorpay/
│
├── backend/
│   ├── main.py
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