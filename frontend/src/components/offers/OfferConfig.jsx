export default function OfferConfig({ offer, onClose }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Offer Execution Flow</h2>

        {/* OFFER SUMMARY */}
        <div style={styles.summary}>
          <div><b>Offer:</b> {offer.name}</div>
          <div><b>Geo:</b> {offer.geo}</div>
          <div><b>Carrier:</b> {offer.carrier}</div>
          <div><b>API Mode:</b> {offer.apiMode}</div>
          <div>
            <b>Fraud Protection:</b>{" "}
            {offer.fraudEnabled ? "Enabled" : "Disabled"}
          </div>
        </div>

        {/* FLOW */}
        <FlowStep
          title="1. Check Status API"
          url={offer.statusCheckUrl}
          params={["service_id", "msisdn", "partner_id", "transaction_id"]}
        />

        <FlowStep
          title="2. PIN / OTP Send"
          url={offer.pinSendUrl}
          params={offer.pinSendParams}
        />

        <FlowStep
          title="3. PIN Verify"
          url={offer.pinVerifyUrl}
          params={offer.pinVerifyParams}
        />

        <FlowStep
          title="4. Product Redirect"
          url="Generated dynamically after OTP success"
          params={["transaction_id"]}
          highlight
        />

        <div style={styles.actions}>
          <button onClick={onClose} style={styles.close}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------- FLOW STEP COMPONENT -------- */

const FlowStep = ({ title, url, params = [], highlight }) => (
  <div
    style={{
      ...styles.step,
      borderColor: highlight ? "#16a34a" : "#1e293b",
    }}
  >
    <h4 style={styles.stepTitle}>{title}</h4>

    <div style={styles.url}>
      <span style={styles.label}>URL:</span>
      <span style={styles.value}>{url || "Not configured"}</span>
    </div>

    <div>
      <span style={styles.label}>Parameters:</span>
      <ul style={styles.params}>
        {params?.length
          ? params.map((p) => <li key={p}>{p}</li>)
          : <li>None</li>}
      </ul>
    </div>
  </div>
);

/* -------- STYLES -------- */

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 60,
  },
  card: {
    width: "760px",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#020617",
    padding: "28px",
    borderRadius: "14px",
    color: "#fff",
  },
  heading: {
    textAlign: "center",
    marginBottom: "18px",
  },
  summary: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    fontSize: "14px",
    marginBottom: "20px",
    color: "#cbd5f5",
  },
  step: {
    border: "1px solid #1e293b",
    borderRadius: "10px",
    padding: "14px",
    marginBottom: "14px",
  },
  stepTitle: {
    color: "#38bdf8",
    marginBottom: "8px",
    fontSize: "14px",
  },
  url: {
    marginBottom: "6px",
  },
  label: {
    fontSize: "12px",
    color: "#94a3b8",
    marginRight: "6px",
  },
  value: {
    fontSize: "13px",
    color: "#e5e7eb",
  },
  params: {
    paddingLeft: "18px",
    fontSize: "13px",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "20px",
  },
  close: {
    background: "#334155",
    border: "none",
    padding: "10px 18px",
    borderRadius: "8px",
    color: "#fff",
    cursor: "pointer",
  },
};
