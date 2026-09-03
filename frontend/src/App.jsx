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
  Search,
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


function getFailureReason(action) {
  if (action?.failure_reason) {
    return action.failure_reason;
  }

  const method = (action?.payment_method || "").toUpperCase();

  const reasons = {
    CARD: "Bank declined",
    NETBANKING: "Bank authorization failed",
    WALLET: "Wallet service unavailable",
    UPI: "UPI authorization failed",
  };

  return reasons[method] || "Transaction processing error";
}

function parseAIAnalysis(analysis) {
  if (!analysis) return null;

  const normalize = (value) =>
    String(value || "")
      .replace(/\*\*/g, "")
      .replace(/^[\s\-*•#]+|[\s\-*•#]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const buildResult = (rawSections) => {
    const sections = {
      failureInterpretation: normalize(rawSections.failureInterpretation),
      recoveryStrategy: normalize(rawSections.recoveryStrategy),
      priority: normalize(rawSections.priority),
      personalizedMessage: normalize(rawSections.personalizedMessage),
      suggestedNextAction: normalize(rawSections.suggestedNextAction),
    };

    const priorityMatch = sections.priority.match(
      /\b(LOW|MEDIUM|HIGH)\b/i
    );
    if (!priorityMatch) return null;
    sections.priority = priorityMatch[1].toUpperCase();

    const required = [
      sections.failureInterpretation,
      sections.recoveryStrategy,
      sections.personalizedMessage,
      sections.suggestedNextAction,
    ];
    if (required.some((value) => !value)) return null;

    const leakedInstructions =
      /\b(analyze user input|thinking process|key points to include|mental refinement|section by section|return only|output format|do not invent|no markdown|rules?:)\b/i;
    if (required.some((value) => leakedInstructions.test(value))) {
      return null;
    }
    return sections;
  };

  if (typeof analysis === "object" && !Array.isArray(analysis)) {
    return buildResult({
      failureInterpretation:
        analysis.failure_interpretation || analysis.failureInterpretation,
      recoveryStrategy:
        analysis.recovery_strategy ||
        analysis.recoveryStrategy ||
        analysis.recommended_strategy,
      priority: analysis.priority,
      personalizedMessage:
        analysis.personalized_message || analysis.personalizedMessage,
      suggestedNextAction:
        analysis.suggested_next_action || analysis.suggestedNextAction,
    });
  }

  if (typeof analysis !== "string") return null;

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
    "recommended strategy": "recoveryStrategy",
    "priority": "priority",
    "personalized message": "personalizedMessage",
    "suggested next action": "suggestedNextAction",
  };

  let currentKey = null;
  for (const rawLine of analysis.replace(/\r/g, "").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(
      /^(?:[-•*]\s*)?(?:\*\*)?(Failure Interpretation|Recovery Strategy|Recommended Strategy|Priority|Personalized Message|Suggested Next Action)(?:\*\*)?\s*:\s*(.*)$/i
    );

    if (match) {
      currentKey = sectionMap[match[1].toLowerCase()];
      if (currentKey && match[2].trim()) {
        sections[currentKey] = match[2].trim();
      }
      continue;
    }

    if (currentKey) {
      sections[currentKey] = `${sections[currentKey]} ${line}`.trim();
    }
  }

  return buildResult(sections);
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

  const [hinglishMessage, setHinglishMessage] = useState("");
const [hinglishLoading, setHinglishLoading] = useState(false);
const [hinglishError, setHinglishError] = useState("");


  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // =========================
  // RECOVERY TIMELINE STATE
  // =========================

  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState("");

  // =========================
  // PAYMENTS STATE
  // =========================

  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState("");

  // Interactive payment directory filters
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");

  // Interactive customer directory state
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerKey, setSelectedCustomerKey] = useState(null);

  const [simulating, setSimulating] = useState(false);
const [simulationMessage, setSimulationMessage] = useState("");

const [recoveryMetrics, setRecoveryMetrics] = useState({
  revenue_at_risk: 0,
  revenue_recovered: 0,
  recovery_rate: 0,
  pending_recovery: 0,
});

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

  const handleDeletePayment = async (paymentId) => {
  const confirmed = window.confirm(
    "Are you sure you want to delete this payment?"
  );

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/payments/${paymentId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      throw new Error("Could not delete payment");
    }

    const data = await response.json();

    if (data.status !== "success") {
      throw new Error(
        data.message || "Could not delete payment"
      );
    }

    // Remove the deleted payment immediately from the UI
    setPayments((currentPayments) =>
      currentPayments.filter(
        (payment) =>
          payment.payment_id !== paymentId
      )
    );

  } catch (err) {
    alert(
      "Unable to delete payment. Please try again."
    );
  }
};

  const fetchRecoveryMetrics = async () => {
  try {
    const response = await fetch(
      `${API_URL}/recovery-metrics`
    );

    if (!response.ok) {
      throw new Error("Could not load recovery metrics");
    }

    const data = await response.json();

    if (data.status === "success") {
      setRecoveryMetrics(data.metrics);
    }
  } catch (err) {
    console.error("Metrics error:", err);
  }
};

const handleSimulatePayment = async () => {
  try {
    setSimulating(true);
    setSimulationMessage("");

    const response = await fetch(
      `${API_URL}/simulate-failed-payment`,
      {
        method: "POST",
      }
    );

    if (!response.ok) {
      throw new Error("Simulation failed");
    }

    const data = await response.json();

    if (data.status !== "success") {
      throw new Error(
        data.message || "Simulation failed"
      );
    }

    setSimulationMessage(
      `New revenue risk detected successfully.`
    );

    await Promise.all([
      fetchRecoveryActions(true),
      fetchPayments(),
      fetchRecoveryMetrics(),
    ]);

  } catch (err) {
    console.error(err);
    setSimulationMessage(
      "Unable to simulate a payment failure."
    );
  } finally {
    setSimulating(false);
  }
};

  // =========================
  // FETCH RECOVERY TIMELINE
  // =========================

  const fetchRecoveryTimeline = async (paymentId) => {
    if (!paymentId) {
      setTimeline([]);
      return;
    }

    try {
      setTimelineLoading(true);
      setTimelineError("");

      const response = await fetch(
        `${API_URL}/recovery-timeline/${paymentId}`
      );

      if (!response.ok) {
        throw new Error("Could not load recovery timeline");
      }

      const data = await response.json();

      if (data.status !== "success") {
        throw new Error(
          data.message || "Could not load recovery timeline"
        );
      }

      setTimeline(data.timeline || []);
    } catch (err) {
      setTimeline([]);
      setTimelineError(
        "Unable to load the recovery timeline."
      );
    } finally {
      setTimelineLoading(false);
    }
  };

  // =========================
  // INITIAL LOAD
  // =========================

 useEffect(() => {
  fetchRecoveryActions();
  fetchPayments();
  fetchRecoveryMetrics();
}, []);

  // Always clear old AI output when the selected payment changes.
useEffect(() => {

  setAiAnalysis("");
  setAnalysisError("");

  // Keep Hinglish output tied to the currently selected payment too.
  setHinglishMessage("");
  setHinglishError("");

}, [selectedAction?.payment_id]);

  // Load the payment recovery journey whenever a payment is selected.
  useEffect(() => {
    if (selectedAction?.payment_id) {
      fetchRecoveryTimeline(
        selectedAction.payment_id
      );
    } else {
      setTimeline([]);
      setTimelineError("");
    }
  }, [selectedAction?.payment_id]);

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

  setHinglishMessage("");
  setHinglishError("");

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

      const paymentId = selectedAction.payment_id;
      const response = await fetch(
        `${API_URL}/ai-analyze/${paymentId}`,
        { method: "POST" }
      );

      if (!response.ok) {
        throw new Error(
          `AI analysis request failed: ${response.status}`
        );
      }

      const data = await response.json();
      console.log("AI Analysis Response:", data);

      if (data.status !== "success") {
        throw new Error(
          data.message || "Could not generate AI analysis"
        );
      }

      // Prefer validated structured data from the backend. Keep the
      // old text parser as a compatibility fallback.
      const parsedAnalysis =
        parseAIAnalysis(data.analysis) ||
        parseAIAnalysis(data.ai_analysis || "");

      if (!parsedAnalysis) {
        throw new Error(
          "AI returned an unusable analysis. Please try again."
        );
      }

      // Store only validated data so leaked Groq instructions cannot
      // reach the dashboard UI.
      setAiAnalysis(parsedAnalysis);

      try {
        await fetchRecoveryActions(true);
      } catch (refreshError) {
        console.error(
          "Failed to refresh recovery actions:",
          refreshError
        );
      }

    } catch (err) {
      console.error("AI analysis error:", err);
      setAnalysisError(
        err.message ||
        "Unable to generate AI analysis. Please try again."
      );
    } finally {
      setAnalyzing(false);
    }
  };

    // =========================
  // HINGLISH RECOVERY MESSAGE
  // =========================

  const handleHinglishMessage = async () => {
    if (!selectedAction) return;

    try {
      setHinglishLoading(true);
      setHinglishError("");
      setHinglishMessage("");

      const paymentId = selectedAction.payment_id;

      const response = await fetch(
        `${API_URL}/ai-analyze-hinglish/${paymentId}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Hinglish request failed: ${response.status}`
        );
      }

      const data = await response.json();

      console.log(
        "Hinglish Message Response:",
        data
      );

      if (data.status !== "success") {
        throw new Error(
          data.message ||
          "Could not generate Hinglish message"
        );
      }

      const message =
        typeof data.hinglish_message === "string"
          ? data.hinglish_message.trim()
          : "";

      if (!message) {
        throw new Error(
          "No Hinglish message was returned."
        );
      }

      setHinglishMessage(message);

    } catch (err) {
      console.error(
        "Hinglish message error:",
        err
      );

      setHinglishError(
        err.message ||
        "Unable to generate Hinglish message. Please try again."
      );

    } finally {
      setHinglishLoading(false);
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

      await Promise.all([
        fetchRecoveryActions(true),
        fetchPayments(),
        fetchRecoveryMetrics(),
        fetchRecoveryTimeline(
          selectedAction.payment_id
        ),
      ]);
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
  // PAYMENT DIRECTORY FILTERS
  // =========================

  const paymentStatuses = Array.from(
    new Set(
      payments
        .map((payment) => (payment.status || "unknown").toLowerCase())
        .filter(Boolean)
    )
  );

  const paymentMethods = Array.from(
    new Set(
      payments
        .map((payment) => (payment.payment_method || "unknown").toUpperCase())
        .filter(Boolean)
    )
  );

  const filteredPayments = payments.filter((payment) => {
    const searchValue = paymentSearch.trim().toLowerCase();
    const customerName = (payment.name || "").toLowerCase();
    const customerEmail = (payment.email || "").toLowerCase();
    const paymentId = String(
      payment.razorpay_payment_id || payment.payment_id || ""
    ).toLowerCase();

    const matchesSearch =
      !searchValue ||
      customerName.includes(searchValue) ||
      customerEmail.includes(searchValue) ||
      paymentId.includes(searchValue);

    const matchesStatus =
      paymentStatusFilter === "all" ||
      (payment.status || "unknown").toLowerCase() === paymentStatusFilter;

    const matchesMethod =
      paymentMethodFilter === "all" ||
      (payment.payment_method || "unknown").toUpperCase() ===
        paymentMethodFilter;

    return matchesSearch && matchesStatus && matchesMethod;
  });

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
          customerKey,
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
          failedCount: 0,
          recoveredCount: 0,
        };
      }

      customerMap[customerKey].paymentCount += 1;

      customerMap[customerKey].totalAmount +=
        Number(payment.amount || 0);

      const customerPaymentStatus =
        (payment.status || "unknown").toLowerCase();

      if (customerPaymentStatus === "failed") {
        customerMap[customerKey].failedCount += 1;
      }

      if (
        customerPaymentStatus === "recovered" ||
        customerPaymentStatus === "captured" ||
        customerPaymentStatus === "completed" ||
        customerPaymentStatus === "success" ||
        customerPaymentStatus === "paid"
      ) {
        customerMap[customerKey].recoveredCount += 1;
      }

      return customerMap;
    }, {})
  );

  const normalizedCustomerSearch = customerSearch
    .trim()
    .toLowerCase();

  const filteredCustomers = customers.filter((customer) => {
    if (!normalizedCustomerSearch) return true;

    return [
      customer.name,
      customer.email,
      customer.phone,
      customer.userId,
    ]
      .filter(Boolean)
      .some((value) =>
        String(value).toLowerCase().includes(normalizedCustomerSearch)
      );
  });

  const selectedCustomer = customers.find(
    (customer) => customer.customerKey === selectedCustomerKey
  );

  const selectedCustomerPayments = selectedCustomer
    ? payments.filter((payment) => {
        const key =
          payment.email ||
          payment.user_id ||
          payment.name ||
          payment.payment_id;

        return key === selectedCustomer.customerKey;
      })
    : [];

  const customerDirectoryStats = {
    totalCustomers: customers.length,
    totalPayments: customers.reduce(
      (sum, customer) => sum + customer.paymentCount,
      0
    ),
    totalValue: customers.reduce(
      (sum, customer) => sum + customer.totalAmount,
      0
    ),
  };

  // =========================
  // PAYMENT METRICS
  // =========================

  const paymentStats = payments.reduce(
    (stats, payment) => {
      const status = (payment.status || "unknown").toLowerCase();
      const amount = Number(payment.amount || 0);

      stats.totalVolume += amount;

      if (status === "failed") {
        stats.failed += 1;
      }

      if (
  status === "captured" ||
  status === "completed" ||
  status === "success" ||
  status === "paid" ||
  status === "recovered"
) {
  stats.successful += 1;
}

      return stats;
    },
    {
      totalVolume: 0,
      failed: 0,
      successful: 0,
    }
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

              <div className="recovery-page-actions">
  <button
    className="refresh-button simulate-button"
    onClick={handleSimulatePayment}
    disabled={simulating}
  >
    {simulating ? (
      <Loader2 className="spin" size={17} />
    ) : (
      <CircleAlert size={17} />
    )}

    {simulating
      ? "Simulating..."
      : "Simulate Revenue Risk"}
  </button>

  <button
    className="refresh-button"
    onClick={() => {
      fetchRecoveryActions(true);
      fetchPayments();
      fetchRecoveryMetrics();
    }}
    disabled={refreshing}
  >
    {refreshing ? (
      <Loader2 className="spin" size={17} />
    ) : (
      <RefreshCw size={17} />
    )}

    Refresh
  </button>
</div>

            </section>
{simulationMessage && (
  <div
    style={{
      marginBottom: "18px",
      padding: "12px 16px",
      borderRadius: "10px",
      background: "#ecfdf5",
      color: "#065f46",
      fontSize: "14px",
      fontWeight: "600",
    }}
  >
    {simulationMessage}
  </div>
)}
            {/* ================= METRICS ================= */}

            <section className="overview">

              <div className="metric">

                <div className="metric-label">
                  <WalletCards size={16} />
                  Revenue at risk
                </div>

                <div className="metric-value">
                  {formatCurrency(recoveryMetrics.revenue_at_risk)}
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
                  {recoveryMetrics.pending_recovery}
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
                  {recoveryMetrics.recovery_rate}%
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
                  <span>Failure Reason</span>
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

                      <span className="failure-cell">
                        {getFailureReason(action)}
                      </span>

                      <span>

                        <span
                          className={`status-pill status-${(
                            action.status || "pending"
                          ).toLowerCase()}`}
                        >

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

                    <section
                      style={{
                        marginTop: "18px",
                        marginBottom: "18px",
                        padding: "16px",
                        border: "1px solid #d9dee7",
                        background: "#ffffff",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "10px",
                          letterSpacing: "0.16em",
                          color: "#6b7280",
                          marginBottom: "8px",
                          fontWeight: "700",
                        }}
                      >
                        PAYMENT RECOVERY TIMELINE
                      </div>

                      <h4
                        style={{
                          margin: "0 0 14px",
                          fontSize: "16px",
                        }}
                      >
                        Recovery journey
                      </h4>

                      {timelineLoading ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "13px",
                            color: "#6b7280",
                          }}
                        >
                          <Loader2 className="spin" size={17} />
                          Loading timeline...
                        </div>
                      ) : timelineError ? (
                        <p
                          style={{
                            margin: 0,
                            fontSize: "13px",
                            color: "#b45309",
                          }}
                        >
                          {timelineError}
                        </p>
                      ) : timeline.length === 0 ? (
                        <p
                          style={{
                            margin: 0,
                            fontSize: "13px",
                            color: "#6b7280",
                          }}
                        >
                          No timeline events available yet.
                        </p>
                      ) : (
                        <div>
                          {timeline.map((event, index) => {
                            const eventTime = event.time
                              ? new Date(event.time).toLocaleString(
                                  "en-IN",
                                  {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  }
                                )
                              : "Time unavailable";

                            const isLast =
                              index === timeline.length - 1;

                            return (
                              <div
                                key={`${event.stage}-${index}`}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns:
                                    "18px 1fr",
                                  columnGap: "10px",
                                  paddingBottom:
                                    isLast ? 0 : "14px",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                  }}
                                >
                                  <span
                                    style={{
                                      width: "10px",
                                      height: "10px",
                                      borderRadius: "50%",
                                      background:
                                        event.stage === "RECOVERED"
                                          ? "#2f855a"
                                          : "#4267a8",
                                      marginTop: "4px",
                                      flexShrink: 0,
                                    }}
                                  />
                                  {!isLast && (
                                    <span
                                      style={{
                                        width: "1px",
                                        background: "#d9dee7",
                                        flex: 1,
                                        marginTop: "5px",
                                      }}
                                    />
                                  )}
                                </div>

                                <div>
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent:
                                        "space-between",
                                      gap: "12px",
                                      alignItems: "baseline",
                                    }}
                                  >
                                    <strong
                                      style={{
                                        fontSize: "13px",
                                      }}
                                    >
                                      {event.title}
                                    </strong>

                                    <span
                                      style={{
                                        fontSize: "10px",
                                        letterSpacing: "0.08em",
                                        color: "#6b7280",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {event.stage}
                                    </span>
                                  </div>

                                  <p
                                    style={{
                                      margin: "5px 0 4px",
                                      fontSize: "12px",
                                      lineHeight: "1.55",
                                      color: "#5f6b7a",
                                    }}
                                  >
                                    {event.detail}
                                  </p>

                                  <span
                                    style={{
                                      fontSize: "11px",
                                      color: "#8a94a3",
                                    }}
                                  >
                                    {eventTime}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>

                    <section className="ai-review-card">

                      <div className="ai-review-header">
                        <div>
                          <div className="ai-review-kicker">
                            AI RECOVERY REVIEW
                          </div>

                          <h4>
                            {aiAnalysis
                              ? "AI-generated recovery assessment"
                              : "Review this payment with AI"}
                          </h4>
                        </div>

                        {aiAnalysis && (
                          <span className="ai-reviewed-badge">
                            REVIEWED
                          </span>
                        )}
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
                          Run the AI review to generate a recovery assessment
    for this payment.
                        </p>

                      )}
                      </div>

                      <button
                        className="ai-review-action"
                        onClick={handleReviewAction}
                        disabled={analyzing}
                      >
                        {analyzing
                          ? "Analyzing..."
                          : aiAnalysis
                          ? "Refresh AI Review"
                          : "Run AI Review"}

                        {analyzing ? (
                          <Loader2
                            className="spin"
                            size={17}
                          />
                        ) : (
                          <ArrowUpRight size={17} />
                        )}
                      </button>

                    </section>
{/* HINGLISH RECOVERY MESSAGE - SEPARATE FROM AI REVIEW */}
<section className="ai-review-card">

  <div className="ai-review-header">
    <div>
      <div className="ai-review-kicker">
        HINGLISH RECOVERY MESSAGE
      </div>

      <h4>
        Customer-friendly recovery message
      </h4>
    </div>

    {hinglishMessage && (
      <span className="ai-reviewed-badge">
        READY
      </span>
    )}
  </div>

  <div className="ai-message">

    <div className="ai-message-label">
      NATURAL INDIAN HINGLISH
    </div>

    {hinglishLoading ? (

      <div className="analyzing-state">
        <Loader2
          className="spin"
          size={20}
        />

        <span>
          Generating Hinglish message...
        </span>
      </div>

    ) : hinglishError ? (

      <p className="analysis-error">
        {hinglishError}
      </p>

    ) : hinglishMessage ? (

      <p>
        {hinglishMessage}
      </p>

    ) : (

      <p>
        Generate a short, customer-friendly Hinglish
        recovery message for this failed payment.
      </p>

    )}

  </div>

  <button
    className="ai-review-action"
    onClick={handleHinglishMessage}
    disabled={hinglishLoading}
  >

    {hinglishLoading
      ? "Generating..."
      : hinglishMessage
      ? "Refresh Hinglish Message"
      : "Generate Hinglish Message"}

    {hinglishLoading ? (
      <Loader2
        className="spin"
        size={17}
      />
    ) : (
      <ArrowUpRight size={17} />
    )}

  </button>

</section>
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
  ? "Sending..."
  : "Send Recovery Message"}

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

                      <div
                        className={`status-text status-${(
                          selectedAction.status || "pending"
                        ).toLowerCase()}`}
                      >

                        <span className="status-dot" />

                        {selectedAction.status ||
                          "pending"}

                      </div>


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

            <section className="page-heading directory-page-heading">

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

            <section className="directory-overview">

              <div className="directory-metric">
                <span>Total payment volume</span>
                <strong>{formatCurrency(paymentStats.totalVolume)}</strong>
                <small>Across {payments.length} recorded payment{payments.length !== 1 ? "s" : ""}</small>
              </div>

              <div className="directory-metric">
                <span>Failed payments</span>
                <strong>{paymentStats.failed}</strong>
                <small>Payments requiring recovery attention</small>
              </div>

              <div className="directory-metric">
                <span>Successful payments</span>
                <strong>{paymentStats.successful}</strong>
                <small>Completed or successfully captured payments</small>
              </div>

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
                  {filteredPayments.length} of {payments.length} total
                </div>

              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) 180px 180px auto",
                  gap: "12px",
                  marginBottom: "18px",
                  alignItems: "center",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    border: "1px solid #d9dee7",
                    padding: "0 12px",
                    minHeight: "42px",
                    background: "#ffffff",
                  }}
                >
                  <Search size={17} color="#6b7280" />
                  <input
                    type="text"
                    value={paymentSearch}
                    onChange={(event) => setPaymentSearch(event.target.value)}
                    placeholder="Search customer, email or payment ID"
                    style={{
                      border: "none",
                      outline: "none",
                      width: "100%",
                      font: "inherit",
                      color: "#1f2d3d",
                      background: "transparent",
                    }}
                  />
                </label>

                <select
                  value={paymentStatusFilter}
                  onChange={(event) =>
                    setPaymentStatusFilter(event.target.value)
                  }
                  style={{
                    minHeight: "42px",
                    border: "1px solid #d9dee7",
                    padding: "0 10px",
                    background: "#ffffff",
                    font: "inherit",
                    color: "#344054",
                  }}
                >
                  <option value="all">All statuses</option>
                  {paymentStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>

                <select
                  value={paymentMethodFilter}
                  onChange={(event) =>
                    setPaymentMethodFilter(event.target.value)
                  }
                  style={{
                    minHeight: "42px",
                    border: "1px solid #d9dee7",
                    padding: "0 10px",
                    background: "#ffffff",
                    font: "inherit",
                    color: "#344054",
                  }}
                >
                  <option value="all">All methods</option>
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>

                {(paymentSearch ||
                  paymentStatusFilter !== "all" ||
                  paymentMethodFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentSearch("");
                      setPaymentStatusFilter("all");
                      setPaymentMethodFilter("all");
                    }}
                    style={{
                      minHeight: "42px",
                      border: "1px solid #d9dee7",
                      padding: "0 14px",
                      background: "#ffffff",
                      font: "inherit",
                      cursor: "pointer",
                      color: "#4267a8",
                      fontWeight: 600,
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>

              <div className="payments-table-header">
                <span>Customer</span>
                <span>Amount</span>
                <span>Method</span>
                <span>Status</span>
                <span>Payment ID</span>
                <span>Action</span>
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
                payments.length > 0 &&
                filteredPayments.length === 0 && (
                  <div className="state-row">
                    No payments match the selected filters.
                  </div>
                )}

              {!paymentsLoading &&
                !paymentsError &&
                filteredPayments.map((payment) => (

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
                      <span
                        className={`status-pill status-${(
                          payment.status || "unknown"
                        ).toLowerCase()}`}
                      >

                        <span className="status-dot" />

                        {payment.status ||
                          "unknown"}

                      </span>
                    </div>

                    <div className="payment-id-cell">
  {payment.razorpay_payment_id ||
    `Payment #${payment.payment_id}`}
</div>

<div className="payment-delete-cell">
  <button
    className="delete-payment-button"
    onClick={() =>
      handleDeletePayment(payment.payment_id)
    }
  >
    Delete
  </button>
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

            <section className="page-heading directory-page-heading">

              <div>

                <div className="eyebrow">
                  OPERATIONS / CUSTOMERS
                </div>

                <h1>
                  Customers
                </h1>

                <p>
                  Search customer profiles and inspect their payment activity.
                </p>

              </div>

              <button
                className="refresh-button"
                onClick={fetchPayments}
                disabled={paymentsLoading}
              >

                {paymentsLoading ? (
                  <Loader2 className="spin" size={17} />
                ) : (
                  <RefreshCw size={17} />
                )}

                Refresh

              </button>

            </section>

            <section className="metrics-strip customer-metrics">
  <div className="metric-card">
    <div className="metric-label">Total customers</div>
    <div className="metric-value">
      {customerDirectoryStats.totalCustomers}
    </div>
    <div className="metric-subtext">
      Across recorded payment activity
    </div>
  </div>

  <div className="metric-card">
    <div className="metric-label">Total payments</div>
    <div className="metric-value">
      {customerDirectoryStats.totalPayments}
    </div>
    <div className="metric-subtext">
      Payments linked to customer profiles
    </div>
  </div>

  <div className="metric-card">
    <div className="metric-label">Customer value</div>
    <div className="metric-value">
      {formatCurrency(customerDirectoryStats.totalValue)}
    </div>
    <div className="metric-subtext">
      Combined recorded payment volume
    </div>
  </div>
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
                  {filteredCustomers.length} of {customers.length} total
                </div>

              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginBottom: "14px",
                }}
              >
                <div style={{ position: "relative", flex: 1 }}>
                  <Search
                    size={18}
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    value={customerSearch}
                    onChange={(event) => {
                      setCustomerSearch(event.target.value);
                      setSelectedCustomerKey(null);
                    }}
                    placeholder="Search customer, email, phone or customer ID"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "11px 14px 11px 42px",
                      border: "1px solid #cfd7e3",
                      background: "transparent",
                      color: "inherit",
                      font: "inherit",
                    }}
                  />
                </div>

                {customerSearch && (
                  <button
                    className="refresh-button"
                    onClick={() => {
                      setCustomerSearch("");
                      setSelectedCustomerKey(null);
                    }}
                  >
                    Clear
                  </button>
                )}
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
                  <Loader2 className="spin" size={20} />
                  Loading customers...
                </div>
              )}

              {paymentsError && (
                <div className="error-state">
                  <CircleAlert size={20} />
                  <div>
                    <strong>Connection issue</strong>
                    <p>{paymentsError}</p>
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
                customers.length > 0 &&
                filteredCustomers.length === 0 && (
                  <div className="state-row">
                    No customers match your search.
                  </div>
                )}

              {!paymentsLoading &&
                !paymentsError &&
                filteredCustomers.map((customer) => (

                  <div
                    className="payment-row"
                    key={customer.customerKey}
                    onClick={() =>
                      setSelectedCustomerKey((current) =>
                        current === customer.customerKey
                          ? null
                          : customer.customerKey
                      )
                    }
                    style={{
                      cursor: "pointer",
                      outline:
                        selectedCustomerKey === customer.customerKey
                          ? "1px solid #4667a3"
                          : "none",
                    }}
                    title="Click to view customer payment activity"
                  >

                    <div className="customer-cell">
                      <strong>{customer.name}</strong>
                      <small>{customer.email}</small>
                    </div>

                    <div className="method-cell">
                      {customer.phone}
                    </div>

                    <div className="amount-cell">
                      {customer.paymentCount}
                    </div>

                    <div className="amount-cell">
                      {formatCurrency(customer.totalAmount)}
                    </div>

                    <div className="payment-id-cell">
                      {customer.userId}
                    </div>

                  </div>

                ))}

              {selectedCustomer && (
                <div
                  style={{
                    marginTop: "18px",
                    border: "1px solid #cfd7e3",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "16px",
                      alignItems: "flex-start",
                      marginBottom: "16px",
                    }}
                  >
                    <div>
                      <div className="section-kicker">CUSTOMER ACTIVITY</div>
                      <h3 style={{ margin: "6px 0" }}>
                        {selectedCustomer.name}
                      </h3>
                      <p style={{ margin: 0 }}>
                        {selectedCustomer.email}
                      </p>
                    </div>

                    <button
                      className="refresh-button"
                      onClick={() => setSelectedCustomerKey(null)}
                    >
                      Close
                    </button>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: "12px",
                      marginBottom: "16px",
                    }}
                  >
                    <div>
                      <small>Payments</small>
                      <strong style={{ display: "block", marginTop: "4px" }}>
                        {selectedCustomer.paymentCount}
                      </strong>
                    </div>
                    <div>
                      <small>Total value</small>
                      <strong style={{ display: "block", marginTop: "4px" }}>
                        {formatCurrency(selectedCustomer.totalAmount)}
                      </strong>
                    </div>
                    <div>
                      <small>Failed payments</small>
                      <strong style={{ display: "block", marginTop: "4px" }}>
                        {selectedCustomer.failedCount}
                      </strong>
                    </div>
                  </div>

                  <div className="section-kicker" style={{ marginBottom: "8px" }}>
                    PAYMENT HISTORY
                  </div>

                  {selectedCustomerPayments.map((payment) => (
                    <div
                      key={payment.payment_id || payment.razorpay_payment_id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto auto",
                        gap: "16px",
                        padding: "10px 0",
                        borderTop: "1px solid #e1e6ee",
                      }}
                    >
                      <span>
                        {payment.razorpay_payment_id ||
                          `Payment #${payment.payment_id}`}
                      </span>
                      <span>{formatCurrency(payment.amount)}</span>
                      <span>{payment.status || "Unknown"}</span>
                    </div>
                  ))}
                </div>
              )}

            </section>

          </>
        )}

      </main>

    </div>
  );
}

export default App;