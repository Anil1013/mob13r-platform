import { useState } from "react";
import { saveOffer } from "../../services/offers";

export default function OfferForm({ onClose }) {
  const [form, setForm] = useState({
    name: "",
    advertiser: "",
    geo: "",
    carrier: "",
    plan: "",
    payout: "",
    revenue: "",
    method: "POST",
    parameters: "",
    antifraud: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async () => {
    await saveOffer({
      ...form,
      id: "OFF-" + Date.now(), // auto ID
    });
    onClose();
  };

  return (
    <div style={styles.card}>
      <h3>Create / Edit Offer</h3>

      <div style={styles.grid}>
        <input name="name" placeholder="Offer Name" onChange={handleChange} />
        <input name="advertiser" placeholder="Advertiser" onChange={handleChange} />
        <input name="geo" placeholder="Geo (Kuwait)" onChange={handleChange} />
        <input name="carrier" placeholder="Carrier (Zain)" onChange={handleChange} />
        <input name="plan" placeholder="Plan (Daily / Weekly)" onChange={handleChange} />
        <input name="payout" placeholder="Payout" onChange={handleChange} />
        <input name="revenue" placeholder="Revenue" onChange={handleChange} />
      </div>

      <select name="method" onChange={handleChange}>
        <option value="POST">POST Method</option>
        <option value="GET">GET Method</option>
      </select>

      <textarea
        name="parameters"
        placeholder="Paste API Docs / Parameters here"
        rows={4}
        onChange={handleChange}
      />

      <label>
        <input type="checkbox" name="antifraud" onChange={handleChange} /> Enable Anti-Fraud
      </label>

      <div style={styles.actions}>
        <button onClick={handleSubmit}>Save Offer</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: "#020617",
    border: "1px solid #1e293b",
    padding: "20px",
    borderRadius: "12px",
    marginTop: "20px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
    marginBottom: "12px",
  },
  actions: {
    marginTop: "12px",
    display: "flex",
    gap: "10px",
  },
};
