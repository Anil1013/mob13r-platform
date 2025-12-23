export default function OfferConfig({ offer, onClose }) {
  if (!offer) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Offer Execution Flow</h2>

        <p style={styles.sub}>
          {offer.name}
          {offer.advertiser_name && ` • ${offer.advertiser_name}`}
          {offer.geo && ` • ${offer.geo}`}
          {offer.carrier && ` • ${offer.carrier}`}
        </p>

        {/* ================= STEP 1 ================= */}
        <Step
          title="1. Check Status"
          method={offer.api_mode}
          url={offer.status_check_url}
          params={["msisdn", "transaction_id", "ip", "ua"]}
        />

        {/* ================= STEP 2 ================= */}
        <Step
          title="2. PIN Send"
          method={offer.api_mode}
          url={offer.pin_send_url}
          params={normalizeParams(offer.pin_send_params, [
            "transaction_id",
            "ip",
            "ua",
          ])}
        />

        {/* ================= STEP 3 ================= */}
        <Step
          title="3. PIN Verify"
          method={offer.api_mode}
          url={offer.pin_verify_url}
          params={normalizeParams(offer.pin_verify_params, [
            "transaction_id",
            "ip",
            "ua",
          ])}
        />

        {/* ================= STEP 4 ================= */}
        {offer.fraud_enabled && (
          <div style={styles.step}>
            <h4 style={styles.stepTitle}>4. Anti-Fraud</h4>
            <div style={styles.kv}>
              Partner: {offer.fraud_partner || "—"}
            </div>
            <div style={styles.kv}>
              Service: {offer.fraud_service || "—"}
            </div>
          </div>
        )}

        {/* ================= STEP 5 ================= */}
        <div style={styles.step}>
          <h4 style={styles.stepTitle}>5. Redirect to Product</h4>
          <div style={styles.kv}>
            Redirect user after successful OTP verification
          </div>
        </div>

        <button style={styles.close} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

/* =====================================================
   HELPERS
===================================================== */

const normalizeParams = (params, alwaysInclude = []) => {
  let list = [];

  if (Array.isArray(params)) list = params;
  else if (typeof params === "string")
    list = params.split(",").map((p) => p.trim());

  // ensure no duplicates
  const merged = [...new Set([...list, ...alwaysInclude])];

  return merged;
};

/* =====================================================
   SMALL UI BLOCK
===================================================== */

const Step = ({ title, method, url, params }) => (
  <div style={styles.step}>
    <h4 style={styles.stepTitle}>{title}</h4>

    <div style={styles.kv}>Method: {method || "—"}</div>
    <div style={styles.kv}>URL: {url || "—"}</div>

    <div style={styles.params}>
      Params:
      {params && params.length ? (
        params.map((p) => (
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
    width: "680px",
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
  },
  param: {
    background: "#1e293b",
    padding: "4px 8px",
    borderRadius: "6px",
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
