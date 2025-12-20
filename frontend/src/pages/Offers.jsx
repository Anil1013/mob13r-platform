import { useEffect, useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

/* ===============================
   OFFER ID GENERATOR
   Backend me ye DB handle karega
================================ */
const generateOfferId = (geo, carrier, index) =>
  `OFF-${geo.slice(0, 2).toUpperCase()}-${carrier
    .slice(0, 4)
    .toUpperCase()}-${String(index + 1).padStart(3, "0")}`;

export default function Offers() {
  /* ===============================
     STATE
  ================================ */
  const [offers, setOffers] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    geo: "",
    carrier: "",
    payout: "",
    revenue: "",
    status: "Active",

    /* API CONFIG */
    pinSendUrl: "",
    pinVerifyUrl: "",
    statusCheckUrl: "",
    productUrl: "",

    /* FRAUD CONFIG */
    fraudJsUrl: "",
    fraudPartner: "",
    fraudService: "",
  });

  /* ===============================
     GET OFFERS (API READY)
  ================================ */
  useEffect(() => {
    // 🔁 FUTURE:
    // fetch("/api/offers").then(res => res.json()).then(setOffers);

    // TEMP DEMO DATA (from your documents)
    setOffers([
      {
        name: "Shemaroo Weekly Pack",
        geo: "Kuwait",
        carrier: "Zain",
        payout: 0.8,
        revenue: 1.5,
        status: "Active",

        pinSendUrl: "https://stc-kw.kidzo.mpx.mobi/api/v2/pin/send",
        pinVerifyUrl: "https://stc-kw.kidzo.mpx.mobi/api/v2/pin/verify",
        statusCheckUrl: "https://selapi.selvasportal.com:444/api/service/check-status",
        productUrl: "https://www.shemaroome.com/",

        fraudJsUrl: "https://fd.sla-alacrity.com/d513e9e03227.js",
        fraudPartner: "partner:977bade4-42dc-4c4c-b957-3c8ac2fa4a2b",
        fraudService: "campaign:52d659a55c4e41953de8ed68d57f06ef89d6a217",
      },
    ]);
  }, []);

  /* ===============================
     FORM HANDLERS
  ================================ */
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = () => {
    const newOffer = { ...form };

    // 🔁 FUTURE POST:
    // fetch("/api/offers", { method:"POST", body: JSON.stringify(newOffer) })

    setOffers((prev) => [...prev, newOffer]);
    setShowForm(false);
  };

  /* ===============================
     UI
  ================================ */
  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div style={styles.main}>
        <Header />

        <div style={styles.content}>
          <div style={styles.topRow}>
            <h2>Offers</h2>
            <button style={styles.addBtn} onClick={() => setShowForm(true)}>
              + Add Offer
            </button>
          </div>

          {/* ================= TABLE ================= */}
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
                {offers.map((o, i) => (
                  <tr key={i}>
                    <td style={styles.mono}>
                      {generateOfferId(o.geo, o.carrier, i)}
                    </td>
                    <td>{o.name}</td>
                    <td>{o.geo}</td>
                    <td>{o.carrier}</td>
                    <td>${o.payout}</td>
                    <td>${o.revenue}</td>
                    <td>
                      <span
                        style={{
                          ...styles.badge,
                          background:
                            o.status === "Active" ? "#16a34a" : "#ca8a04",
                        }}
                      >
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ================= CREATE / EDIT FORM ================= */}
          {showForm && (
            <div style={styles.form}>
              <h3>Create / Edit Offer</h3>

              <input name="name" placeholder="Offer Name" onChange={handleChange} />
              <input name="geo" placeholder="Geo (Kuwait)" onChange={handleChange} />
              <input name="carrier" placeholder="Carrier (Zain)" onChange={handleChange} />
              <input name="payout" placeholder="Payout" onChange={handleChange} />
              <input name="revenue" placeholder="Revenue" onChange={handleChange} />

              <h4>API Endpoints</h4>
              <input name="pinSendUrl" placeholder="PIN Send URL" onChange={handleChange} />
              <input name="pinVerifyUrl" placeholder="PIN Verify URL" onChange={handleChange} />
              <input name="statusCheckUrl" placeholder="Status Check URL" onChange={handleChange} />
              <input name="productUrl" placeholder="Product / Portal URL" onChange={handleChange} />

              <h4>Fraud / Anti-Fraud</h4>
              <input name="fraudJsUrl" placeholder="Fraud JS URL" onChange={handleChange} />
              <input name="fraudPartner" placeholder="Partner ID" onChange={handleChange} />
              <input name="fraudService" placeholder="Service / Campaign ID" onChange={handleChange} />

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

/* ===============================
   STYLES
================================ */
const styles = {
  main: { flex: 1, background: "#020617", minHeight: "100vh" },
  content: { padding: 24, color: "#fff" },
  topRow: { display: "flex", justifyContent: "space-between" },
  addBtn: {
    background: "#2563eb",
    border: "none",
    padding: "8px 14px",
    color: "#fff",
    borderRadius: 6,
    cursor: "pointer",
  },
  card: {
    border: "1px solid #1e293b",
    borderRadius: 10,
    marginTop: 20,
    overflow: "hidden",
  },
  table: { width: "100%", textAlign: "center", borderCollapse: "collapse" },
  mono: { fontFamily: "monospace", color: "#93c5fd" },
  badge: {
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 12,
    color: "#fff",
  },
  form: {
    marginTop: 30,
    padding: 20,
    border: "1px solid #1e293b",
    borderRadius: 10,
  },
  saveBtn: {
    marginTop: 10,
    background: "#16a34a",
    border: "none",
    padding: "10px",
    color: "#fff",
    borderRadius: 6,
    cursor: "pointer",
  },
};
