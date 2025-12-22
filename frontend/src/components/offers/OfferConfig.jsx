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

        {/* STEP 1 */}
        <Step
          title="1. Check Status"
          method={offer.apiMode}
          url={offer.statusCheckUrl}
          params={["service_id", "msisdn", "partner_id", "transaction_id"]}
        />

        {/* STEP 2 */}
        <Step
          title="2. PIN Send"
          method={offer.apiMode}
          url={offer.pinSendUrl}
          params={normalizeParams(offer.pinSendParams)}
        />

        {/* STEP 3 */}
        <Step
          title="3. PIN Verify"
          method={offer.apiMode}
          url={offer.pinVerifyUrl}
          params={normalizeParams(offer.pinVerifyParams)}
        />

        {/* STEP 4 */}
        {offer.fraudEnabled && (
          <div style={styles.step}>
            <h4 style={styles.stepTitle}>4. Anti-Fraud</h4>
            <div style={styles.kv}>
              Partner: {offer.fraudPartner || "—"}
            </div>
            <div style={styles.kv}>
              Service: {offer.fraudService || "—"}
            </div>
          </div>
        )}

        {/* STEP 5 */}
        <div style={styles.step}>
          <h4 style={styles.stepTitle}>5. Redirect to Product</h4>
          <div style={styles.kv}>Redirect after OTP success</div>
        </div>

        <button style={styles.close} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

/* ================= HELPERS ================= */

const normalizeParams = (params) => {
  if (!params) return [];
  if (Array.isArray(params)) return params;
  if (typeof params === "string")
    return params.split(",").map((p) => p.trim());
  return [];
};

/* ================= SMALL UI BLOCK ================= */

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

/* ================= STYLES (UNCHANGED) ================= */

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
  },
};
