import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import OfferForm from "../components/offers/OfferForm";
import OfferConfig from "../components/offers/OfferConfig";

export default function Offers() {
  const [showForm, setShowForm] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);

  const offers = [
    {
      id: "OFF-1001",
      name: "Shemaroo Weekly Pack",
      geo: "Kuwait",
      carrier: "Zain",
      payout: 0.5,
      revenue: 1.2,
      status: "Active",
    },
    {
      id: "OFF-1002",
      name: "Zain Sports Bundle",
      geo: "Kuwait",
      carrier: "Zain",
      payout: 0.7,
      revenue: 1.5,
      status: "Paused",
    },
  ];

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div style={styles.main}>
        <Header />

        <div style={styles.content}>
          <div style={styles.headerRow}>
            <h2>Offers</h2>
            <button onClick={() => setShowForm(true)} style={styles.createBtn}>
              + Create Offer
            </button>
          </div>

          {/* TABLE */}
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
                <th>Config</th>
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
                  <td>
                    <button
                      style={styles.link}
                      onClick={() => setSelectedOffer(o)}
                    >
                      Configure
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {showForm && <OfferForm onClose={() => setShowForm(false)} />}
          {selectedOffer && (
            <OfferConfig
              offer={selectedOffer}
              onClose={() => setSelectedOffer(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  main: { flex: 1, background: "#020617", minHeight: "100vh" },
  content: { padding: 24, color: "#fff" },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  createBtn: {
    background: "#2563eb",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  status: {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    color: "#fff",
  },
  link: {
    color: "#38bdf8",
    background: "none",
    border: "none",
    cursor: "pointer",
  },
};
