import { useState } from "react";

export default function OfferForm({ onClose, onSave, initialData = null }) {
  const [offer, setOffer] = useState(
    initialData || {
      name: "",
      advertiser: "",
      geo: "",
      carrier: "",
      plan: "",
      payout: "",
      revenue: "",
      method: "POST",
      parameters: "",
      enableAntiFraud: false,
      antiFraudScript: "",
      status: "Active",
    }
  );

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setOffer({
      ...offer,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // 🔮 Future API hook
    if (onSave) {
      onSave({
        ...offer,
        id: initialData?.id || `OFF-${Date.now()}`,
      });
    }

    onClose();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.heading}>
          {initialData ? "Edit Offer" : "Create Offer"}
        </h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* BASIC INFO */}
          <div style={styles.grid}>
            <input
              style={styles.input}
              name="name"
              placeholder="Offer Name"
              value={offer.name}
              onChange={handleChange}
              required
            />
            <input
              style={styles.input}
              name="advertiser"
              placeholder="Advertiser"
              value={offer.advertiser}
              onChange={handleChange}
              required
            />
            <input
              style={styles.input}
              name="geo"
              placeholder="Geo (e.g. Kuwait)"
              value={offer.geo}
              onChange={handleChange}
            />
            <input
              style={styles.input}
              name="carrier"
              placeholder="Carrier (e.g. Zain)"
              value={offer.carrier}
              onChange={handleChange}
            />
            <input
              style={styles.input}
              name="plan"
              placeholder="Plan (Daily / Weekly / Monthly)"
              value={offer.plan}
              onChange={handleChange}
            />
            <select
              name="method"
              value={offer.method}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="POST">POST</option>
              <option value="GET">GET</option>
            </select>
          </div>

          {/* PAYOUT */}
          <div style={styles.grid}>
            <input
              style={styles.input}
              name="payout"
              placeholder="Payout"
              value={offer.payout}
              onChange={handleChange}
            />
            <input
              style={styles.input}
              name="revenue"
              placeholder="Revenue"
              value={offer.revenue}
              onChange={handleChange}
            />
          </div>

          {/* PARAMETERS */}
          <textarea
            style={styles.textarea}
            name="parameters"
            placeholder="Request Parameters (from documents)
Example:
msisdn={msisdn}
operator={operator}
transaction_id={txn_id}"
            value={offer.parameters}
            onChange={handleChange}
          />

          {/* ANTI FRAUD */}
          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              name="enableAntiFraud"
              checked={offer.enableAntiFraud}
              onChange={handleChange}
            />
            Enable Anti-Fraud
          </label>

          {offer.enableAntiFraud && (
            <textarea
              style={styles.textarea}
              name="antiFraudScript"
              placeholder="Paste Anti-Fraud Script / Pixel here"
              value={offer.antiFraudScript}
              onChange={handleChange}
            />
          )}

          {/* ACTIONS */}
          <div style={styles.actions}>
            <button type="button" style={styles.cancel} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" style={styles.save}>
              Save Offer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(2,6,23,0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  modal: {
    width: "720px",
    background: "#020617",
    borderRadius: "16px",
    padding: "28px",
    border: "1px solid #1e293b",
    color: "#fff",
  },
  heading: {
    fontSize: "22px",
    marginBottom: "20px",
    textAlign: "center",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  input: {
    padding: "12px",
    background: "#020617",
    border: "1px solid #1e293b",
    borderRadius: "8px",
    color: "#fff",
  },
  textarea: {
    minHeight: "90px",
    padding: "12px",
    background: "#020617",
    border: "1px solid #1e293b",
    borderRadius: "8px",
    color: "#fff",
    resize: "vertical",
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "10px",
  },
  cancel: {
    padding: "10px 16px",
    background: "#020617",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#fff",
    cursor: "pointer",
  },
  save: {
    padding: "10px 18px",
    background: "#2563eb",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
};
