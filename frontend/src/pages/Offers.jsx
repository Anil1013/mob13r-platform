import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

const generateOfferId = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `OFF-${date}-${rand}`;
};

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    id: "",
    name: "",
    advertiser: "",
    geo: "",
    carrier: "",
    plan: "",
    price: "",
    payout: "",
    revenue: "",
    status: "Active",
    method: "POST",
    pinSendUrl: "",
    pinVerifyUrl: "",
    statusCheckUrl: "",
    portalUrl: "",
    antiFraudEnabled: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = () => {
    const newOffer = {
      ...form,
      id: generateOfferId(),
    };
    setOffers([...offers, newOffer]);
    setShowForm(false);
    setForm({
      ...form,
      name: "",
      advertiser: "",
      geo: "",
      carrier: "",
      plan: "",
      price: "",
      payout: "",
      revenue: "",
      pinSendUrl: "",
      pinVerifyUrl: "",
      statusCheckUrl: "",
      portalUrl: "",
      antiFraudEnabled: false,
    });
  };

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div style={styles.main}>
        <Header />

        <div style={styles.content}>
          <div style={styles.topBar}>
            <h2>Offers</h2>
            <button style={styles.createBtn} onClick={() => setShowForm(!showForm)}>
              + Create Offer
            </button>
          </div>

          {/* OFFERS TABLE */}
          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Geo</th>
                  <th>Carrier</th>
                  <th>Payout</th>
                  <th>Revenue</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>{o.name}</td>
                    <td>{o.geo}</td>
                    <td>{o.carrier}</td>
                    <td>${o.payout}</td>
                    <td>${o.revenue}</td>
                    <td>
                      <span
                        style={{
                          ...styles.status,
                          background:
                            o.status === "Active" ? "#16a34a" : "#ca8a04",
                        }}
                      >
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {offers.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>
                      No offers created yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* CREATE / EDIT FORM */}
          {showForm && (
            <div style={styles.formCard}>
              <h3>Create / Edit Offer</h3>

              <div style={styles.grid}>
                <input name="name" placeholder="Offer Name" onChange={handleChange} />
                <input name="advertiser" placeholder="Advertiser" onChange={handleChange} />
                <input name="geo" placeholder="Geo (Kuwait)" onChange={handleChange} />
                <input name="carrier" placeholder="Carrier (Zain)" onChange={handleChange} />
                <input name="plan" placeholder="Plan (Daily / Weekly)" onChange={handleChange} />
                <input name="price" placeholder="Price" onChange={handleChange} />
                <input name="payout" placeholder="Payout" onChange={handleChange} />
                <input name="revenue" placeholder="Revenue" onChange={handleChange} />

                <select name="method" onChange={handleChange}>
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                </select>

                <input name="pinSendUrl" placeholder="PIN Send API URL" onChange={handleChange} />
                <input name="pinVerifyUrl" placeholder="PIN Verify API URL" onChange={handleChange} />
                <input name="statusCheckUrl" placeholder="Status Check API URL" onChange={handleChange} />
                <input name="portalUrl" placeholder="Portal / Landing URL" onChange={handleChange} />
              </div>

              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  name="antiFraudEnabled"
                  onChange={handleChange}
                />
                Enable Anti-Fraud
              </label>

              <button style={styles.saveBtn} onClick={handleSubmit}>
                Save Offer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  main: {
    flex: 1,
    background: "#020617",
    minHeight: "100vh",
  },
  content: {
    padding: "24px",
    color: "#fff",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  createBtn: {
    background: "#2563eb",
    border: "none",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
  },
  card: {
    border: "1px solid #1e293b",
    borderRadius: "12px",
    overflow: "hidden",
    marginBottom: "24px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "center",
  },
  status: {
    padding: "4px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    color: "#fff",
  },
  formCard: {
    border: "1px solid #1e293b",
    borderRadius: "12px",
    padding: "20px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
    marginBottom: "16px",
  },
  checkbox: {
    display: "flex",
    gap: "8px",
    marginBottom: "16px",
  },
  saveBtn: {
    background: "#16a34a",
    border: "none",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
  },
};
