import { useEffect, useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import OfferForm from "../components/offers/OfferForm";
import OfferConfig from "../components/offers/OfferConfig";

/* ✅ FUTURE API SERVICE */
import { getOffers, createOffer } from "../services/offers";

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);

  /* 🔄 LOAD OFFERS (GET) */
  useEffect(() => {
    const loadOffers = async () => {
      const data = await getOffers();
      setOffers(data);
    };
    loadOffers();
  }, []);

  /* ➕ CREATE OFFER (POST) */
  const handleCreateOffer = async (newOffer) => {
    const saved = await createOffer(newOffer);
    setOffers((prev) => [...prev, saved]);
    setShowForm(false);
  };

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div style={styles.main}>
        <Header />

        <div style={styles.content}>
          {/* HEADER */}
          <div style={styles.headerRow}>
            <h2 style={styles.title}>Offers</h2>
            <button style={styles.createBtn} onClick={() => setShowForm(true)}>
              + Create Offer
            </button>
          </div>

          {/* TABLE CARD */}
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
                  <th>Config</th>
                </tr>
              </thead>

              <tbody>
                {offers.length === 0 && (
                  <tr>
                    <td colSpan="8" style={styles.empty}>
                      No offers created yet
                    </td>
                  </tr>
                )}

                {offers.map((o) => (
                  <tr key={o.id}>
                    <td style={styles.mono}>{o.id}</td>
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
                            o.status === "Active"
                              ? "#16a34a"
                              : "#ca8a04",
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
          </div>

          {/* MODALS */}
          {showForm && (
            <OfferForm
              onClose={() => setShowForm(false)}
              onSave={handleCreateOffer}
            />
          )}

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

/* 🎨 STYLES (CENTER + CLEAN) */
const styles = {
  main: {
    flex: 1,
    background: "#020617",
    minHeight: "100vh",
  },
  content: {
    padding: 24,
    color: "#fff",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
  },
  createBtn: {
    background: "#2563eb",
    color: "#fff",
    padding: "10px 18px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
  },
  card: {
    border: "1px solid #1e293b",
    borderRadius: 12,
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "center",
  },
  mono: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#93c5fd",
  },
  status: {
    padding: "4px 12px",
    borderRadius: 999,
    fontSize: 12,
    color: "#fff",
    fontWeight: 600,
    display: "inline-block",
  },
  link: {
    background: "none",
    border: "none",
    color: "#38bdf8",
    cursor: "pointer",
    fontWeight: 600,
  },
  empty: {
    padding: 24,
    color: "#94a3b8",
    textAlign: "center",
  },
};
