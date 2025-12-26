export default function OfferConfig({ offer, onClose }) {
  if (!offer) return null;

  const steps = offer.api_steps || {};

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

        {/* ================= API STEPS ================= */}
        {Object.entries(steps).map(([key, step], idx) => {
          if (!step.enabled) return null;

          return (
            <Step
              key={key}
              index={idx + 1}
              title={humanize(key)}
              method={step.method}
              url={step.url}
              headers={step.headers}
              params={step.params}
              matcher={step.success_matcher}
            />
          );
        })}

        {/* ================= REDIRECT ================= */}
        <div style={styles.step}>
          <h4 style={styles.stepTitle}>Redirect</h4>
          <div style={styles.kv}>
            URL: {offer.redirect_url || "—"}
          </div>
          <div style={styles.note}>
            User will be redirected after successful verification
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

function Step({ index, title, method, url, headers = {}, params = {}, matcher }) {
  return (
    <div style={styles.step}>
      <h4 style={styles.stepTitle}>
        {index}. {title}
      </h4>

      <div style={styles.kv}>Method: {method || "—"}</div>
      <div style={styles.kv}>URL: {url || "—"}</div>

      {/* HEADERS */}
      <KVBlock title="Headers" data={headers} />

      {/* PARAMS */}
      <KVBlock title="Params / Body" data={params} />

      {/* SUCCESS MATCHER */}
      {matcher && (
        <div style={styles.matcher}>
          Success Matcher: <code>{matcher}</code>
        </div>
      )}
    </div>
  );
}

/* =====================================================
   KEY VALUE BLOCK
===================================================== */

function KVBlock({ title, data }) {
  const entries = Object.entries(data || {});
  return (
    <div style={styles.block}>
      <div style={styles.blockTitle}>{title}</div>
      {entries.length === 0 ? (
        <div style={styles.empty}>—</div>
      ) : (
        entries.map(([k, v]) => (
          <div key={k} style={styles.kv}>
            <span style={styles.key}>{k}</span>:{" "}
            <span style={styles.val}>{String(v)}</span>
          </div>
        ))
      )}
    </div>
  );
}

/* =====================================================
   HELPERS
===================================================== */

function humanize(str) {
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

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
    width: "800px",
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
    wordBreak: "break-all",
  },
  block: {
    marginTop: "6px",
    fontSize: "12px",
  },
  blockTitle: {
    color: "#94a3b8",
    marginBottom: "2px",
  },
  key: {
    color: "#38bdf8",
    fontFamily: "monospace",
  },
  val: {
    color: "#e5e7eb",
    fontFamily: "monospace",
  },
  empty: {
    color: "#64748b",
    fontStyle: "italic",
  },
  matcher: {
    marginTop: "6px",
    fontSize: "12px",
    color: "#a5b4fc",
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
