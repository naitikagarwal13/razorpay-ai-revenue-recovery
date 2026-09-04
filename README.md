# Razorpay AI Revenue Recovery

<p align="center">
  <img src="frontend/public/favicon.svg" alt="Razorpay AI Revenue Recovery" width="120"/>
</p>

<p align="center">
  AI-powered failed payment recovery platform built with React, FastAPI, MySQL, and Groq AI.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-Vite-61DAFB?style=for-the-badge&logo=react"/>
  <img src="https://img.shields.io/badge/FastAPI-Python-009688?style=for-the-badge&logo=fastapi"/>
  <img src="https://img.shields.io/badge/MySQL-Database-4479A1?style=for-the-badge&logo=mysql"/>
  <img src="https://img.shields.io/badge/Groq-AI-000000?style=for-the-badge"/>
</p>

---

## Overview

**Razorpay AI Revenue Recovery** is a full-stack web application that helps businesses identify failed payments, understand revenue at risk, and manage intelligent recovery workflows.

Instead of treating failed payments as isolated events, the platform combines payment data, customer information, AI-powered payment analysis, recovery recommendations, and recovery tracking into a single operational dashboard.

The AI analyzes failed transactions using **Groq API**, recommends the most suitable recovery strategy, generates personalized customer messages—including **Hinglish messaging**—and tracks the entire recovery lifecycle.

---

## Key Features

### AI-Powered Recovery Dashboard

The Recovery Dashboard provides a centralized operational view of all failed-payment recovery activity.

**Dashboard Metrics**

- Revenue at Risk
- Payments Awaiting Action
- Recovery Coverage
- Payments Requiring Attention
- Failed Payment Recovery Queue

**Recovery Insights**

- AI-powered payment analysis
- Recovery recommendations
- Recovery priority
- Suggested next action
- Recovery status tracking
- Recovery timeline
- Revenue risk simulation

---

### AI Payment Analysis

Every failed payment can be analyzed using the **Groq API**.

The AI evaluates payment and customer context to generate:

- Failure interpretation
- Recovery strategy
- Recovery priority
- Suggested next action
- Personalized customer communication

Example AI output:

> **Failure Reason:** Card expired

> **Recommended Strategy:** Request customer to update card details and retry payment.

> **Priority:** High

> **Next Action:** Send payment update link within 24 hours.

---

### Personalized Recovery Messages

The platform automatically generates customer-friendly recovery messages.

Supported formats include:

- Professional business messaging
- Personalized customer messaging
- Hinglish conversational messaging

Example:

> "Hi Rahul, lagta hai payment complete nahi ho paya. Bas ek click se payment retry karke apna order confirm kar sakte ho."

---

### Recovery Action Tracking

Recovery actions are fully managed inside the application.

Supported capabilities include:

- Create recovery actions
- Prevent duplicate recovery actions
- Track recovery status
- Pending recovery actions
- Contacted state
- Recovered state
- Recovery timeline history

---

### Payments Management

The Payments page provides an operational view of payment activity.

Users can:

- View payment records
- View payment IDs
- View customer information
- View payment amounts
- View payment methods
- View payment status
- Search payments
- Filter by payment status
- Filter by payment method
- Refresh payment data
- Delete payment records

Payment summary metrics are also available.

---

### Customer Management

The Customers page provides customer-centric payment insights.

Displayed information includes:

- Customer Name
- Customer ID
- Email
- Phone Number
- Number of Payments
- Total Payment Value

Users can:

- Search customers
- Refresh customer data
- Select customers
- View payment history
- View customer payment metrics

---

### Revenue Risk Simulation

A built-in simulator introduces a new failed-payment scenario into the application, allowing teams to observe:

- Increased revenue at risk
- AI recommendations
- Recovery workflow behavior
- Updated dashboard metrics

This is useful for demonstrations, testing, and recovery planning.

---

### Search & Filtering

Powerful filtering is available across the platform.

Supported filters:

- Payment search
- Customer search
- Payment status filter
- Payment method filter

---

# Recovery Workflow

The application's core workflow is illustrated below.

```text
Failed Payment Identified
          │
          ▼
Fetch Payment & Customer Data
          │
          ▼
AI Analysis (Groq API)
          │
          ▼
Recovery Recommendation
          │
          ▼
Recovery Action Created
          │
          ▼
Recovery Status Tracked
          │
          ▼
Recovery Timeline Updated
```

The AI assists with decision-making, while the FastAPI backend manages business logic and workflow execution.

---

# System Architecture

```text
                  React Frontend
                       │
                       │ REST API
                       ▼
                FastAPI Backend
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
      MySQL Database           Groq API
          │                         │
          └────────────┬────────────┘
                       ▼
          Recovery Recommendations
          Timeline Updates
          Customer Messages
```

---

# Tech Stack

## Frontend

- React
- Vite
- JavaScript
- CSS
- Lucide React

## Backend

- Python
- FastAPI
- Uvicorn

## Database

- MySQL

## AI

- Groq API

## Development

- Git
- GitHub
- npm
- Python

---

# Project Structure

```text
razorpay-ai-revenue-recovery/
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── public/
│   │   └── favicon.svg
│   │
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
```

> The `.env` file contains local API keys and database credentials and should **never** be committed to GitHub.

---

# Installation

## Prerequisites

Install the following:

- Python 3.9+
- Node.js
- npm
- MySQL
- Git

---

## Clone Repository

```bash
git clone https://github.com/naitikagarwal13/razorpay-ai-revenue-recovery.git
cd razorpay-ai-revenue-recovery
```

---

## Backend Setup

Install dependencies.

```bash
pip install -r backend/requirements.txt
```

Configure environment variables.

Create:

```text
backend/.env
```

Example:

```env
GROQ_API_KEY=your_api_key
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=razorpay_recovery
```

Run FastAPI.

```bash
uvicorn backend.main:app --reload
```

Backend URL:

```text
http://127.0.0.1:8000
```

---

## Frontend Setup

Open another terminal.

```bash
cd frontend
```

Install packages.

```bash
npm install
```

Run development server.

```bash
npm run dev
```

Open the local Vite URL in your browser.

---

# Database

The application uses **MySQL** for persistent storage.

Stored data includes:

- Payments
- Customers
- Recovery Actions
- Recovery Status
- Recovery Timeline

The React frontend never communicates directly with MySQL.

Instead:

```text
React
   │
REST API
   ▼
FastAPI
   │
MySQL
```

This keeps database operations secure and centralized.

---

# API Capabilities

The FastAPI backend provides endpoints for:

- Payment retrieval
- Payment deletion
- Payment metrics
- Customer metrics
- Recovery metrics
- Recovery action creation
- Recovery status updates
- Recovery timeline
- AI payment analysis
- Failed-payment simulation

The AI endpoint uses the **Groq API** to generate structured recovery recommendations.

---

# Current Functionality

### Payments

- Payment management
- Search
- Filtering
- Deletion
- Summary metrics

### Customers

- Customer management
- Search
- Payment history
- Customer metrics

### AI Recovery

- Failed payment analysis
- Recovery strategy
- Priority prediction
- Suggested next action
- Personalized customer messages
- Hinglish messaging

### Recovery Tracking

- Recovery actions
- Duplicate prevention
- Status tracking
- Timeline history

### Dashboard

- Revenue at risk
- Recovery queue
- Recovery coverage
- Revenue risk simulation

### Full Stack

- React frontend
- FastAPI backend
- MySQL integration
- Groq AI integration

---

# Future Enhancements

Planned improvements include:

- Real-time payment event integration
- Automated customer notifications
- Payment retry links
- Recovery success-rate analytics
- AI learning from previous recovery outcomes
- Authentication
- Role-based access control
- Large-scale payment dataset support
- Checkout abandonment recovery
- Subscription failure recovery
- Automated recovery execution

---

# Security

- Environment variables stored in `.env`
- Backend-only database communication
- AI API keys remain server-side
- Duplicate recovery actions prevented
- Centralized recovery workflow management

---

# Important Note

This project focuses on **AI-assisted recovery decision-making**.

The AI provides:

- Payment failure analysis
- Recovery recommendations
- Recovery priority
- Suggested actions
- Personalized customer messaging

The FastAPI backend manages workflow execution, recovery tracking, and data persistence.

This project does **not** claim fully autonomous production payment recovery.

---

# Author

**Naitik Agarwal**

GitHub: **naitikagarwal13**

Repository:

**https://github.com/naitikagarwal13/razorpay-ai-revenue-recovery**

---

<p align="center">
Built with ❤️ using React, FastAPI, MySQL, and Groq AI.
</p>