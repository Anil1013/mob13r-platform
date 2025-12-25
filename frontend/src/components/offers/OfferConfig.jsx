export default function OfferConfig({ offer, onClose }) {
  if (!offer) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Offer Execution Flow</h2>

        {/* ================= META ================= */}
        <p style={styles.sub}>
          {offer.name}
          {offer.advertiser_name && ` • ${offer.advertiser_name}`}
          {offer.geo && ` • ${offer.geo}`}
          {offer.carrier && ` • ${offer.carrier}`}
          {!offer.is_active && " • INACTIVE"}
        </p>

        {/* ================= STEP 1 ================= */}
        {offer.steps?.status_check && (
          <Step
            index={1}
            title="Status Check"
            method={offer.api_mode}
            url={offer.status_check_url}
            params={offer.status_check_params}
          />
        )}

        {/* ================= STEP 2 ================= */}
        {offer.steps?.pin_send && (
          <Step
            index={2}
            title="PIN Send"
            method={offer.api_mode}
            url={offer.pin_send_url}
            params={offer.pin_send_params}
          />
        )}

        {/* ================= STEP 3 ================= */}
        {offer.steps?.pin_verify && (
          <Step
            index={3}
            title="PIN Verify"
            method={offer.api_mode}
            url={offer.pin_verify_url}
            params={offer.pin_verify_params}
          />
        )}

        {/* ================= FRAUD ================= */}
        {offer.fraud_enabled && (
          <div style={styles.step}>
            <h4 style={styles.stepTitle}>Anti-Fraud</h4>
            <div style={styles.kv}>
              Partner: {offer.fraud_partner || "—"}
            </div>
            <div style={styles.kv}>
              Service: {offer.fraud_service || "—"}
            </div>
          </div>
        )}

        {/* ================= REDIRECT ================= */}
        <div style={styles.step}>
          <h4 style={styles.stepTitle}>Redirect</h4>
          <div style={styles.kv}>
            URL: {offer.redirect_url || "—"}
          </div>
          <div style={styles.note}>
            User will be redirected after successful OTP verification
          </div>
        </div>

        {/* ================= ACTION ================= */}
        <button style={styles.close} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

/* =====================================================
   STEP BLOCK
===================================================== */

const Step = ({ index, title, method, url, params = [] }) => {
  const list = Array.isArray(params) ? params : [];

  return (
    <div style={styles.step}>
      <h4 style={styles.stepTitle}>
        {index}. {title}
      </h4>

      <div style={styles.kv}>Method: {method || "—"}</div>
      <div style={styles.kv}>URL: {url || "—"}</div>

      <div style={styles.params}>
        Params:
        {list.length ? (
          list.map((p) => (
            <span key={p} style={styles.param}>
              {p}
            </span>
          ))
        ) : (
          <span style={{ marginLeft: 6 }}>—</span>
        )}
      </div>
    </div>
  );
};

/* =====================================================
   STYLES
===================================================== */

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
    width: "700px",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#020617",
    borderRadius: "14px",
    padding: "24px",
    color: "#fff",
  },
  heading: {
    textAlign: "center",
    marginBottom: "6px",
  },
  sub: {
    textAlign: "center",
    fontSize: "13px",
    color: "#94a3b8",
    marginBottom: "20px",
  },
  step: {
    border: "1px solid #1e293b",
    borderRadius: "10px",
    padding: "14px",
    marginBottom: "12px",
  },
  stepTitle: {
    marginBottom: "8px",
    color: "#38bdf8",
    fontSize: "14px",
  },
  kv: {
    fontSize: "13px",
    marginBottom: "4px",
  },
  params: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    fontSize: "12px",
    marginTop: "6px",
  },
  param: {
    background: "#1e293b",
    padding: "4px 8px",
    borderRadius: "6px",
  },
  note: {
    marginTop: "6px",
    fontSize: "12px",
    color: "#94a3b8",
  },
  close: {
    marginTop: "16px",
    width: "100%",
    padding: "10px",
    background: "#334155",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    cursor: "pointer",
  },
};
