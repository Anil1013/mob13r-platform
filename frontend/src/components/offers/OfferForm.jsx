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
    status: "Active",
    enableAntiFraud: false,
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
      id: crypto.randomUUID(), // 🔑 unique offer id
      ...form,
      createdAt: new Date().toISOString(),
    };

    console.log("Offer Payload:", payload);

    if (onSave) onSave(payload);
    onClose();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Create / Edit Offer</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Row 1 */}
          <div style={styles.row}>
            <input
              style={styles.input}
              placeholder="Offer Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />

            <input
              style={styles.input}
              placeholder="Advertiser"
              name="advertiser"
              value={form.advertiser}
              onChange={handleChange}
              required
            />
          </div>

          {/* Row 2 */}
          <div style={styles.row}>
            <input
              style={styles.input}
              placeholder="Geo (e.g. Kuwait)"
              name="geo"
              value={form.geo}
              onChange={handleChange}
            />

            <input
              style={styles.input}
              placeholder="Carrier (e.g. Zain)"
              name="carrier"
              value={form.carrier}
              onChange={handleChange}
            />
          </div>

          {/* Row 3 */}
          <div style={styles.row}>
            <input
              style={styles.input}
              placeholder="Plan (Daily / Weekly / Monthly)"
              name="plan"
              value={form.plan}
              onChange={handleChange}
            />

            <input
              style={styles.input}
              placeholder="Payout ($)"
              name="payout"
              value={form.payout}
              onChange={handleChange}
            />
          </div>

          {/* Row 4 */}
          <div style={styles.row}>
            <input
              style={styles.input}
              placeholder="Revenue ($)"
              name="revenue"
              value={form.revenue}
              onChange={handleChange}
            />

            <select
              style={styles.input}
              name="status"
              value={form.status}
              onChange={handleChange}
            >
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
            </select>
          </div>

          {/* Anti Fraud */}
          <label style={styles.checkbox}>
            <input
              type="checkbox"
              name="enableAntiFraud"
              checked={form.enableAntiFraud}
              onChange={handleChange}
            />
            Enable Anti-Fraud
          </label>

          {/* Actions */}
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

/* ---------------- STYLES ---------------- */

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(2,6,23,0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    width: "720px",
    background: "#020617",
    borderRadius: "16px",
    padding: "32px",
    color: "#fff",
    border: "1px solid #1e293b",
  },
  title: {
    marginBottom: "24px",
    textAlign: "center",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #1e293b",
    background: "#020617",
    color: "#fff",
  },
  checkbox: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    fontSize: "14px",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "12px",
  },
  cancel: {
    background: "#1e293b",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
  },
  save: {
    background: "#2563eb",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
  },
};
