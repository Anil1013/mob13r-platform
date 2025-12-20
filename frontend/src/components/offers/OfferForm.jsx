import { useState } from "react";

export default function OfferForm({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: "",
    advertiser: "",
    geo: "",
    carrier: "",
    plan: "",
    payout: "",
    revenue: "",
    method: "POST",
    endpoint: "",
    parameters: "",
    antiFraud: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      ...form,
      id: "OFF_" + Date.now(), // 🔑 Unique Offer ID
    };

    onSave?.(payload);
    onClose();
  };

  return (
    <div style={styles.overlay}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h2 style={styles.title}>Create / Edit Offer</h2>

        {/* BASIC INFO */}
        <div style={styles.grid}>
          <input
            name="name"
            placeholder="Offer Name"
            value={form.name}
            onChange={handleChange}
            required
          />
          <input
            name="advertiser"
            placeholder="Advertiser Name"
            value={form.advertiser}
            onChange={handleChange}
            required
          />
          <input
            name="geo"
            placeholder="Geo (e.g. Kuwait)"
            value={form.geo}
            onChange={handleChange}
          />
          <input
            name="carrier"
            placeholder="Carrier (e.g. Zain)"
            value={form.carrier}
            onChange={handleChange}
          />
          <input
            name="plan"
            placeholder="Plan (Daily / Weekly / Monthly)"
            value={form.plan}
            onChange={handleChange}
          />
          <input
            name="payout"
            placeholder="Payout ($)"
            value={form.payout}
            onChange={handleChange}
          />
          <input
            name="revenue"
            placeholder="Revenue ($)"
            value={form.revenue}
            onChange={handleChange}
          />
        </div>

        {/* API CONFIG */}
        <div style={styles.section}>
          <label>Request Method</label>
          <select name="method" value={form.method} onChange={handleChange}>
            <option>POST</option>
            <option>GET</option>
          </select>

          <input
            name="endpoint"
            placeholder="API Endpoint URL"
            value={form.endpoint}
            onChange={handleChange}
          />

          <textarea
            name="parameters"
            placeholder="Request Parameters (JSON format)"
            value={form.parameters}
            onChange={handleChange}
            rows={5}
          />
        </div>

        {/* ANTI FRAUD */}
        <div style={styles.checkbox}>
          <input
            type="checkbox"
            name="antiFraud"
            checked={form.antiFraud}
            onChange={handleChange}
          />
          <span>Enable Anti-Fraud</span>
        </div>

        {/* ACTIONS */}
        <div style={styles.actions}>
          <button type="button" onClick={onClose} style={styles.cancel}>
            Cancel
          </button>
          <button type="submit" style={styles.save}>
            Save Offer
          </button>
        </div>
      </form>
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
  card: {
    width: "720px",
    background: "#020617",
    border: "1px solid #1e293b",
    borderRadius: "14px",
    padding: "24px",
    color: "#fff",
  },
  title: {
    textAlign: "center",
    marginBottom: "20px",
    fontSize: "22px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  section: {
    marginTop: "20px",
    display: "grid",
    gap: "10px",
  },
  checkbox: {
    marginTop: "16px",
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  actions: {
    marginTop: "24px",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
  },
  cancel: {
    background: "#1e293b",
    border: "none",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
  },
  save: {
    background: "#2563eb",
    border: "none",
    color: "#fff",
    padding: "10px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
  },
};
