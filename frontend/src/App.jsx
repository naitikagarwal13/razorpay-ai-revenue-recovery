import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  ChevronRight,
  CheckCircle2,
  CircleAlert,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  WalletCards,
  CreditCard,
} from "lucide-react";

import "./App.css";

const API_URL = "/api";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}


function parseAIAnalysis(analysis) {
  if (!analysis) return null;

  const sections = {
    failureInterpretation: "",
    recoveryStrategy: "",
    priority: "",
    personalizedMessage: "",
    suggestedNextAction: "",
  };

  const sectionMap = {
    "failure interpretation": "failureInterpretation",
    "recovery strategy": "recoveryStrategy",
    priority: "priority",
    "personalized message": "personalizedMessage",
    "suggested next action": "suggestedNextAction",
  };

  const pattern =
    /(Failure Interpretation|Recovery Strategy|Priority|Personalized Message|Suggested Next Action)\s*:\s*([\s\S]*?)(?=(?:Failure Interpretation|Recovery Strategy|Priority|Personalized Message|Suggested Next Action)\s*:|$)/gi;

  let match;

  while ((match = pattern.exec(analysis)) !== null) {
    const key = sectionMap[match[1].toLowerCase()];
    sections[key] = match[2].trim();
  }

  const hasStructuredContent = Object.values(sections).some(Boolean);

  return hasStructuredContent ? sections : null;
}

function App() {
  // =========================
  // NAVIGATION
  // =========================

  const [activePage, setActivePage] = useState("recovery");

  // =========================
  // RECOVERY STATE
  // =========================

  const [actions, setActions] = useState([]);
  const [selectedAction, setSelectedAction] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [aiAnalysis, setAiAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // =========================
  // PAYMENTS STATE
  // =========================

  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState("");

  // =========================
  // FETCH RECOVERY ACTIONS
  // =========================

  const fetchRecoveryActions = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch(
        `${API_URL}/recovery-actions`
      );

      if (!response.ok) {
        throw new Error("Could not load recovery actions");
      }

      const data = await response.json();

      const recoveredActions =
        data.recovery_actions || [];

      setActions(recoveredActions);

      if (recoveredActions.length > 0) {
        setSelectedAction((current) => {
          if (!current) {
            return recoveredActions[0];
          }

          return (
            recoveredActions.find(
              (action) => action.id === current.id
            ) || recoveredActions[0]
          );
        });
      } else {
        setSelectedAction(null);
      }
    } catch (err) {
      setError(
        "Unable to connect to the recovery service. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // =========================
  // FETCH PAYMENTS
  // =========================

  const fetchPayments = async () => {
    try {
      setPaymentsLoading(true);
      setPaymentsError("");

      const response = await fetch(
        `${API_URL}/payments`
      );

      if (!response.ok) {
        throw new Error("Could not load payments");
      }

      const data = await response.json();

      if (data.status !== "success") {
        throw new Error(
          data.message || "Could not load payments"
        );
      }

      setPayments(data.payments || []);
    } catch (err) {
      setPaymentsError(
        "Unable to load payments. Make sure the backend is running."
      );
    } finally {
      setPaymentsLoading(false);
    }
  };

  // =========================
  // INITIAL LOAD
  // =========================

  useEffect(() => {
    fetchRecoveryActions();
  }, []);

  // Load payment data when Payments or Customers opens
  useEffect(() => {
    if (
      (activePage === "payments" ||
        activePage === "customers") &&
      payments.length === 0
    ) {
      fetchPayments();
    }
  }, [activePage]);

  // =========================
  // SELECT ACTION
  // =========================

  const selectAction = (action) => {
    setSelectedAction(action);
    setAiAnalysis("");
    setAnalysisError("");
    setStatusMessage("");
  };

  // =========================
  // AI ANALYSIS
  // =========================

  const handleReviewAction = async () => {
    if (!selectedAction) return;

    try {
      setAnalyzing(true);
      setAnalysisError("");
      setAiAnalysis("");
      setStatusMessage("");

      const paymentId =
        selectedAction.payment_id;

      const response = await fetch(
        `${API_URL}/ai-analyze/${paymentId}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error(
          "AI analysis request failed"
        );
      }

      const data = await response.json();

      if (data.status !== "success") {
        throw new Error(
          data.message ||
            "Could not generate AI analysis"
        );
      }

      setAiAnalysis(
        data.ai_analysis ||
          "No AI analysis was returned."
      );

      await fetchRecoveryActions(true);
    } catch (err) {
      setAnalysisError(
        "Unable to generate AI analysis. Please try again."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  // =========================
  // UPDATE STATUS
  // =========================

  const handleStatusUpdate = async (
    newStatus
  ) => {
    if (!selectedAction) return;

    try {
      setUpdatingStatus(true);
      setStatusMessage("");

      const response = await fetch(
        `${API_URL}/recovery-actions/${selectedAction.id}/status?status=${newStatus}`,
        {
          method: "PUT",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Status update failed"
        );
      }

      const data = await response.json();

      if (data.status !== "success") {
        throw new Error(
          data.message ||
            "Could not update status"
        );
      }

      setActions((currentActions) =>
        currentActions.map((action) =>
          action.id === selectedAction.id
            ? {
                ...action,
                status: newStatus,
              }
            : action
        )
      );

      setSelectedAction((current) => ({
        ...current,
        status: newStatus,
      }));

      setStatusMessage(
        `Payment marked as ${newStatus}.`
      );
    } catch (err) {
      setStatusMessage(
        "Unable to update status. Please try again."
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  // =========================
  // RECOVERY METRICS
  // =========================

  const totalAtRisk = actions
    .filter(
      (action) =>
        action.status !== "recovered" &&
        action.status !== "resolved"
    )
    .reduce(
      (total, action) =>
        total + Number(action.amount || 0),
      0
    );

  const pendingActions = actions.filter(
    (action) =>
      action.status === "pending"
  ).length;

  const parsedAiAnalysis = aiAnalysis
    ? parseAIAnalysis(aiAnalysis)
    : null;

  const selectedMessage =
    selectedAction?.message ||
    "Select a recovery action to view the recommendation.";

  // =========================
  // CUSTOMER DATA
  // =========================

  const customers = Object.values(
    payments.reduce((customerMap, payment) => {
      const customerKey =
        payment.email ||
        payment.user_id ||
        payment.name ||
        payment.payment_id;

      if (!customerMap[customerKey]) {
        customerMap[customerKey] = {
          userId: payment.user_id || "—",
          name:
            payment.name ||
            "Unknown customer",
          email:
            payment.email ||
            "No email available",
          phone:
            payment.phone || "—",
          paymentCount: 0,
          totalAmount: 0,
        };
      }

      customerMap[customerKey].paymentCount += 1;

      customerMap[customerKey].totalAmount +=
        Number(payment.amount || 0);

      return customerMap;
    }, {})
  );

  // =========================
  // RENDER
  // =========================

  return (
    <div className="app-shell">

      {/* ================= HEADER ================= */}

      <header className="topbar">

        <div className="brand">
          <div className="brand-mark">
            R
          </div>

          <div>
            <div className="brand-name">
              RAZORPAY AI
            </div>

            <div className="brand-subtitle">
              Revenue Recovery Console
            </div>
          </div>
        </div>

        <nav className="topnav">

          <button
            className={`nav-item ${
              activePage === "recovery"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("recovery")
            }
          >
            Recovery
          </button>

          <button
            className={`nav-item ${
              activePage === "payments"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("payments")
            }
          >
            Payments
          </button>

          <button
            className={`nav-item ${
              activePage === "customers"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("customers")
            }
          >
            Customers
          </button>

        </nav>

        <div className="topbar-actions">

          <button
            className="icon-button"
            aria-label="Notifications"
          >
            <Bell size={19} />
          </button>

          <div className="profile">
            <div className="profile-avatar">
              NA
            </div>
          </div>

        </div>

      </header>

      <main className="main-content">

        {/* ===================================== */}
        {/* RECOVERY PAGE */}
        {/* ===================================== */}

        {activePage === "recovery" && (
          <>

            <section className="page-heading">

              <div>

                <div className="eyebrow">
                  OPERATIONS / RECOVERY
                </div>

                <h1>
                  Revenue recovery
                </h1>

                <p>
                  Identify failed payments and take the next best action.
                </p>

              </div>

              <button
                className="refresh-button"
                onClick={() =>
                  fetchRecoveryActions(true)
                }
                disabled={refreshing}
              >

                {refreshing ? (
                  <Loader2
                    className="spin"
                    size={17}
                  />
                ) : (
                  <RefreshCw size={17} />
                )}

                Refresh

              </button>

            </section>

            {/* ================= METRICS ================= */}

            <section className="overview">

              <div className="metric">

                <div className="metric-label">
                  <WalletCards size={16} />
                  Revenue at risk
                </div>

                <div className="metric-value">
                  {formatCurrency(totalAtRisk)}
                </div>

                <div className="metric-note">
                  Across {actions.length} recovery action
                  {actions.length !== 1
                    ? "s"
                    : ""}
                </div>

              </div>

              <div className="metric">

                <div className="metric-label">
                  <CircleAlert size={16} />
                  Awaiting action
                </div>

                <div className="metric-value">
                  {pendingActions}
                </div>

                <div className="metric-note">
                  Payments currently pending recovery
                </div>

              </div>

              <div className="metric">

                <div className="metric-label">
                  <ShieldCheck size={16} />
                  Recovery coverage
                </div>

                <div className="metric-value">
                  100%
                </div>

                <div className="metric-note">
                  Every detected failure has a recommendation
                </div>

              </div>

            </section>

            <div className="content-divider" />

            {/* ================= WORKSPACE ================= */}

            <section className="workspace">

              {/* ================= RECOVERY QUEUE ================= */}

              <div className="queue-section">

                <div className="section-header">

                  <div>

                    <div className="section-kicker">
                      RECOVERY QUEUE
                    </div>

                    <h2>
                      Payments requiring attention
                    </h2>

                  </div>

                  <div className="queue-count">
                    {actions.length} total
                  </div>

                </div>

                <div className="table-header">
                  <span>Customer</span>
                  <span>Amount</span>
                  <span>Method</span>
                  <span>Status</span>
                  <span />
                </div>

                {loading && (
                  <div className="state-row">
                    <Loader2
                      className="spin"
                      size={20}
                    />
                    Loading recovery actions...
                  </div>
                )}

                {error && (
                  <div className="error-state">

                    <CircleAlert size={20} />

                    <div>

                      <strong>
                        Connection issue
                      </strong>

                      <p>
                        {error}
                      </p>

                    </div>

                  </div>
                )}

                {!loading &&
                  !error &&
                  actions.length === 0 && (
                    <div className="state-row">
                      No recovery actions found.
                    </div>
                  )}

                {!loading &&
                  !error &&
                  actions.map((action) => (

                    <button
                      key={action.id}
                      className={`recovery-row ${
                        selectedAction?.id ===
                        action.id
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        selectAction(action)
                      }
                    >

                      <span className="customer-cell">

                        <strong>
                          {action.name ||
                            "Unknown customer"}
                        </strong>

                        <small>
                          {action.email ||
                            "No email available"}
                        </small>

                      </span>

                      <span className="amount-cell">
                        {formatCurrency(
                          action.amount
                        )}
                      </span>

                      <span className="method-cell">
                        {action.payment_method ||
                          "—"}
                      </span>

                      <span>

                        <span className="status-pill">

                          <span className="status-dot" />

                          {action.status ||
                            "pending"}

                        </span>

                      </span>

                      <span className="row-arrow">
                        <ChevronRight size={18} />
                      </span>

                    </button>

                  ))}

              </div>

              {/* ================= INTELLIGENCE PANEL ================= */}

              <aside className="intelligence-panel">

                <div className="panel-topline">

                  <span>
                    RECOVERY INTELLIGENCE
                  </span>

                  <span className="live-indicator">
                    <span />
                    LIVE
                  </span>

                </div>

                {selectedAction ? (
                  <>

                    <div className="selected-payment">

                      <div>

                        <span className="payment-label">
                          PAYMENT #
                          {selectedAction.payment_id}
                        </span>

                        <h3>
                          {selectedAction.name ||
                            "Recovery recommendation"}
                        </h3>

                      </div>

                      <div className="selected-amount">
                        {formatCurrency(
                          selectedAction.amount
                        )}
                      </div>

                    </div>

                    <div className="action-summary">

                      <span className="summary-label">
                        Recommended action
                      </span>

                      <strong>
                        {selectedAction.action_type
                          ?.replaceAll("_", " ") ||
                          "PAYMENT RETRY"}
                      </strong>

                    </div>

                    <div className="ai-message">

                      <div className="ai-message-label">

                        {aiAnalysis
                          ? "LIVE AI ANALYSIS"
                          : "RECOVERY ANALYSIS"}

                      </div>

                      {analyzing ? (

                        <div className="analyzing-state">

                          <Loader2
                            className="spin"
                            size={20}
                          />

                          <span>
                            AI is analyzing this payment...
                          </span>

                        </div>

                      ) : analysisError ? (

                        <p className="analysis-error">
                          {analysisError}
                        </p>

                      ) : aiAnalysis && parsedAiAnalysis ? (

                        <div className="structured-ai-analysis">
                          {parsedAiAnalysis.failureInterpretation && (
                            <div className="analysis-section">
                              <span className="analysis-section-title">
                                Failure Interpretation
                              </span>
                              <p>
                                {parsedAiAnalysis.failureInterpretation}
                              </p>
                            </div>
                          )}

                          {parsedAiAnalysis.recoveryStrategy && (
                            <div className="analysis-section">
                              <span className="analysis-section-title">
                                Recovery Strategy
                              </span>
                              <p>
                                {parsedAiAnalysis.recoveryStrategy}
                              </p>
                            </div>
                          )}

                          {parsedAiAnalysis.priority && (
                            <div className="analysis-section">
                              <span className="analysis-section-title">
                                Priority
                              </span>
                              <strong className="priority-value">
                                {parsedAiAnalysis.priority}
                              </strong>
                            </div>
                          )}

                          {parsedAiAnalysis.personalizedMessage && (
                            <div className="analysis-section">
                              <span className="analysis-section-title">
                                Personalized Message
                              </span>
                              <p>
                                {parsedAiAnalysis.personalizedMessage}
                              </p>
                            </div>
                          )}

                          {parsedAiAnalysis.suggestedNextAction && (
                            <div className="analysis-section">
                              <span className="analysis-section-title">
                                Suggested Next Action
                              </span>
                              <p>
                                {parsedAiAnalysis.suggestedNextAction}
                              </p>
                            </div>
                          )}
                        </div>

                      ) : (

                        <p>
                          {aiAnalysis || selectedMessage}
                        </p>

                      )}

                    </div>

                    {statusMessage && (
                      <div className="status-feedback">
                        {statusMessage}
                      </div>
                    )}

                    <div className="recovery-actions">

                      {selectedAction.status !==
                        "contacted" &&
                        selectedAction.status !==
                          "recovered" &&
                        selectedAction.status !==
                          "resolved" && (

                        <button
                          className="secondary-action"
                          onClick={() =>
                            handleStatusUpdate(
                              "contacted"
                            )
                          }
                          disabled={
                            updatingStatus
                          }
                        >

                          <UserCheck size={16} />

                          {updatingStatus
                            ? "Updating..."
                            : "Mark Contacted"}

                        </button>

                      )}

                      {selectedAction.status !==
                        "recovered" &&
                        selectedAction.status !==
                          "resolved" && (

                        <button
                          className="success-action"
                          onClick={() =>
                            handleStatusUpdate(
                              "recovered"
                            )
                          }
                          disabled={
                            updatingStatus
                          }
                        >

                          <CheckCircle2 size={16} />

                          Mark Recovered

                        </button>

                      )}

                    </div>

                    <div className="panel-footer">

                      <div className="status-text">

                        <span className="status-dot" />

                        {selectedAction.status ||
                          "pending"}

                      </div>

                      <button
                        className="primary-action"
                        onClick={
                          handleReviewAction
                        }
                        disabled={analyzing}
                      >

                        {analyzing
                          ? "Analyzing..."
                          : "Review action"}

                        {analyzing ? (
                          <Loader2
                            className="spin"
                            size={17}
                          />
                        ) : (
                          <ArrowUpRight
                            size={17}
                          />
                        )}

                      </button>

                    </div>

                  </>

                ) : (

                  <div className="empty-panel">
                    Select a payment from the recovery queue.
                  </div>

                )}

              </aside>

            </section>

          </>
        )}

        {/* ===================================== */}
        {/* PAYMENTS PAGE */}
        {/* ===================================== */}

        {activePage === "payments" && (
          <>

            <section className="page-heading">

              <div>

                <div className="eyebrow">
                  OPERATIONS / PAYMENTS
                </div>

                <h1>
                  Payments
                </h1>

                <p>
                  View and monitor all payment activity.
                </p>

              </div>

              <button
                className="refresh-button"
                onClick={fetchPayments}
                disabled={paymentsLoading}
              >

                {paymentsLoading ? (
                  <Loader2
                    className="spin"
                    size={17}
                  />
                ) : (
                  <RefreshCw size={17} />
                )}

                Refresh

              </button>

            </section>

            <section className="payments-page">

              <div className="section-header payments-header">

                <div>

                  <div className="section-kicker">
                    PAYMENT DIRECTORY
                  </div>

                  <h2>
                    All payments
                  </h2>

                </div>

                <div className="queue-count">
                  {payments.length} total
                </div>

              </div>

              <div className="payments-table-header">
                <span>Customer</span>
                <span>Amount</span>
                <span>Method</span>
                <span>Status</span>
                <span>Payment ID</span>
              </div>

              {paymentsLoading && (
                <div className="state-row">
                  <Loader2
                    className="spin"
                    size={20}
                  />
                  Loading payments...
                </div>
              )}

              {paymentsError && (
                <div className="error-state">

                  <CircleAlert size={20} />

                  <div>

                    <strong>
                      Connection issue
                    </strong>

                    <p>
                      {paymentsError}
                    </p>

                  </div>

                </div>
              )}

              {!paymentsLoading &&
                !paymentsError &&
                payments.length === 0 && (
                  <div className="state-row">
                    No payments found.
                  </div>
                )}

              {!paymentsLoading &&
                !paymentsError &&
                payments.map((payment) => (

                  <div
                    className="payment-row"
                    key={payment.payment_id}
                  >

                    <div className="customer-cell">

                      <strong>
                        {payment.name ||
                          "Unknown customer"}
                      </strong>

                      <small>
                        {payment.email ||
                          "No email available"}
                      </small>

                    </div>

                    <div className="amount-cell">
                      {formatCurrency(
                        payment.amount
                      )}
                    </div>

                    <div className="method-cell">
                      {payment.payment_method ||
                        "—"}
                    </div>

                    <div>
                      <span className="status-pill">

                        <span className="status-dot" />

                        {payment.status ||
                          "unknown"}

                      </span>
                    </div>

                    <div className="payment-id-cell">
                      {payment.razorpay_payment_id ||
                        `Payment #${payment.payment_id}`}
                    </div>

                  </div>

                ))}

            </section>

          </>
        )}

        {/* ===================================== */}
        {/* CUSTOMERS PAGE */}
        {/* ===================================== */}

        {activePage === "customers" && (
          <>

            <section className="page-heading">

              <div>

                <div className="eyebrow">
                  OPERATIONS / CUSTOMERS
                </div>

                <h1>
                  Customers
                </h1>

                <p>
                  View customer profiles and payment activity.
                </p>

              </div>

              <button
                className="refresh-button"
                onClick={fetchPayments}
                disabled={paymentsLoading}
              >

                {paymentsLoading ? (
                  <Loader2
                    className="spin"
                    size={17}
                  />
                ) : (
                  <RefreshCw size={17} />
                )}

                Refresh

              </button>

            </section>

            <section className="payments-page">

              <div className="section-header payments-header">

                <div>

                  <div className="section-kicker">
                    CUSTOMER DIRECTORY
                  </div>

                  <h2>
                    All customers
                  </h2>

                </div>

                <div className="queue-count">
                  {customers.length} total
                </div>

              </div>

              <div className="payments-table-header">
                <span>Customer</span>
                <span>Phone</span>
                <span>Payments</span>
                <span>Total value</span>
                <span>Customer ID</span>
              </div>

              {paymentsLoading && (
                <div className="state-row">

                  <Loader2
                    className="spin"
                    size={20}
                  />

                  Loading customers...

                </div>
              )}

              {paymentsError && (
                <div className="error-state">

                  <CircleAlert size={20} />

                  <div>

                    <strong>
                      Connection issue
                    </strong>

                    <p>
                      {paymentsError}
                    </p>

                  </div>

                </div>
              )}

              {!paymentsLoading &&
                !paymentsError &&
                customers.length === 0 && (
                  <div className="state-row">
                    No customers found.
                  </div>
                )}

              {!paymentsLoading &&
                !paymentsError &&
                customers.map((customer) => (

                  <div
                    className="payment-row"
                    key={
                      customer.email ||
                      customer.userId
                    }
                  >

                    <div className="customer-cell">

                      <strong>
                        {customer.name}
                      </strong>

                      <small>
                        {customer.email}
                      </small>

                    </div>

                    <div className="method-cell">
                      {customer.phone}
                    </div>

                    <div className="amount-cell">
                      {customer.paymentCount}
                    </div>

                    <div className="amount-cell">
                      {formatCurrency(
                        customer.totalAmount
                      )}
                    </div>

                    <div className="payment-id-cell">
                      {customer.userId}
                    </div>

                  </div>

                ))}

            </section>

          </>
        )}

      </main>

    </div>
  );
}

export default App;