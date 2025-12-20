import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

/* 🔑 ID Generator */
const generateOfferId = (geo, carrier, count) =>
  `OFF-${geo.slice(0, 2).toUpperCase()}-${carrier
    .slice(0, 4)
    .toUpperCase()}-${String(count + 1).padStart(3, "0")}`;

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    geo: "",
    carrier: "",
    payout: "",
    revenue: "",
    status: "Active",
    pinSend: "",
    pinVerify: "",
    statusCheck: "",
    portalUrl: "",
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const saveOffer = () => {
    if (!form.name || !form.geo || !form.carrier) {
      alert("Name, Geo & Carrier required");
      return;
    }

    const newOffer = {
      id: generateOfferId(form.geo, form.carrier, offers.length),
      name: form.name,
      geo: form.geo,
      carrier: form.carrier,
      payout: form.payout,
      revenue: form.revenue,
      status: form.status,
      apis: {
        pinSend: form.pinSend,
        pinVerify: form.pinVerify,
        statusCheck: form.statusCheck,
        portalUrl: form.portalUrl,
      },
    };

    setOffers([...offers, newOffer]);
    setShowForm(false);
    setForm({
      name: "",
      geo: "",
      carrier: "",
      payout: "",
      revenue: "",
      status: "Active",
      pinSend: "",
      pinVerify: "",
      statusCheck: "",
      portalUrl: "",
    });
  };

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div style={styles.main}>
        <Header />

        <div style={styles.content}>
          <div style={styles.top}>
            <h2>Offers</h2>
            <button style={styles.addBtn} onClick={() => setShowForm(true)}>
              + Add Offer
            </button>
          </div>

          {/* OFFER TABLE */}
          <table style={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Geo</th>
                <th>Carrier</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id}>
                  <td style={styles.mono}>{o.id}</td>
                  <td>{o.name}</td>
                  <td>{o.geo}</td>
                  <td>{o.carrier}</td>
                  <td>{o.status}</td>
                </tr>
              ))}
              {offers.length === 0 && (
                <tr>
                  <td colSpan="5" style={styles.empty}>
                    No offers added yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* CREATE / EDIT FORM */}
          {showForm && (
            <div style={styles.form}>
              <h3>Create Offer (Paste APIs from Document)</h3>

              <input name="name" placeholder="Offer Name" onChange={handleChange} />
              <input name="geo" placeholder="Geo (Kuwait)" onChange={handleChange} />
              <input
                name="carrier"
                placeholder="Carrier (Zain)"
                onChange={handleChange}
              />
              <input name="payout" placeholder="Payout" onChange={handleChange} />
              <input name="revenue" placeholder="Revenue" onChange={handleChange} />

              <textarea
                name="pinSend"
                placeholder="PIN Send API (paste full URL)"
                onChange={handleChange}
              />
              <textarea
                name="pinVerify"
                placeholder="PIN Verify API"
                onChange={handleChange}
              />
              <textarea
                name="statusCheck"
                placeholder="Status Check API"
                onChange={handleChange}
              />
              <textarea
                name="portalUrl"
                placeholder="Portal URL"
                onChange={handleChange}
              />

              <div style={styles.formActions}>
                <button onClick={saveOffer}>Save Offer</button>
                <button onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  main: { flex: 1, background: "#020617", minHeight: "100vh" },
  content: { padding: "24px", color: "#fff" },
  top: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "16px",
  },
  addBtn: {
    background: "#2563eb",
    border: "none",
    padding: "8px 14px",
    color: "#fff",
    borderRadius: "8px",
    cursor: "pointer",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: "24px",
  },
  mono: { fontFamily: "monospace", fontSize: "12px", color: "#93c5fd" },
  empty: { textAlign: "center", color: "#94a3b8", padding: "20px" },

  form: {
    border: "1px solid #1e293b",
    padding: "20px",
    borderRadius: "12px",
  },
  formActions: { display: "flex", gap: "12px", marginTop: "12px" },
};
