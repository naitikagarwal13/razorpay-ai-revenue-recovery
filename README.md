# Razorpay AI Revenue Recovery

Razorpay AI Revenue Recovery is a full-stack web application designed to help businesses identify failed payments and take suitable recovery actions.

The project provides a dashboard for managing payments, customers, and recovery actions. It also uses AI to analyze failed payments and suggest what can be done next, including generating personalized recovery messages.

The main idea behind the project is to make the payment recovery process easier by bringing payment information, customer details, and AI-based recommendations into one place.

---

## Features

### Payment Dashboard

The Payments page provides an overview of payment activity.

Users can:

- View all payment records
- See payment IDs, customer details, amount, status, and payment method
- Search for payments
- Filter payments based on status
- Filter payments based on payment method
- Track successful and failed payments
- Refresh payment data
- Delete payment records

The page also displays important payment metrics to give a quick overview of the available payment data.

---

### Customer Management

The Customers page provides a customer-focused view of the payment data.

It includes information such as:

- Customer name
- Customer ID
- Email address
- Phone number
- Number of payments
- Total payment value

Users can also search for customers and refresh the displayed data.

The customer metrics provide a quick overview of the total customers, payments, and overall customer value.

---

### AI-Powered Revenue Recovery

The Recovery page focuses on failed payments that may result in revenue loss.

The dashboard shows important information such as:

- Revenue at risk
- Payments awaiting action
- Recovery coverage
- Payments requiring attention
- Recovery-related metrics

A failed payment can be selected and analyzed using AI.

The AI analysis provides useful information including:

- Failure interpretation
- Suggested recovery strategy
- Priority level
- Recommended next action
- Personalized message for the customer

This helps in deciding how a particular failed payment should be handled.

---

### Hinglish Recovery Messages

The application can generate personalized customer recovery messages in a natural Hinglish style.

This makes the communication feel more conversational and familiar while still encouraging the customer to complete or retry the payment.

The generated message can be used as a suggested communication approach for payment recovery.

---

### Recovery Action Tracking

Recovery actions are stored and tracked through the application.

This makes it possible to keep track of what action has been suggested or taken for a failed payment.

The system also helps prevent unnecessary duplicate recovery actions for the same payment.

---

### Revenue Risk Simulation

The project includes a revenue risk simulation feature to provide a better understanding of potential revenue loss and recovery scenarios.

This gives users another way to visualize the impact of failed payments and the importance of taking recovery actions.

---

### Search and Filtering

The application includes search and filtering functionality to make it easier to work with larger sets of payment and customer data.

Users can quickly:

- Search payments
- Search customers
- Filter payment status
- Filter payment methods

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

### AI Integration

- AI API for payment analysis and recovery recommendations

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