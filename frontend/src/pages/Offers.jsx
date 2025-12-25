import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import OfferForm from "../components/offers/OfferForm";
import OfferConfig from "../components/offers/OfferConfig";

import { getOffers, createOffer, updateOffer } from "../services/offers";

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);

  const navigate = useNavigate();

  /* ================= LOAD OFFERS ================= */
  const loadOffers = async () => {
    try {
      setLoading(true);
      const data = await getOffers();
      setOffers(data || []);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load offers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  /* ================= CREATE ================= */
  const handleCreateOffer = async (payload) => {
    try {
      await createOffer(payload);
      setShowForm(false);
      loadOffers();
    } catch {
      alert("Failed to create offer");
    }
  };

  /* ================= UPDATE ================= */
  const handleUpdateOffer = async (payload) => {
    try {
      await updateOffer(editingOffer.id, payload);
      setEditingOffer(null);
      loadOffers();
    } catch {
      alert("Failed to update offer");
    }
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

            <div style={{ display: "flex", gap: 12 }}>
              <button
                style={styles.logsBtn}
                onClick={() => navigate("/execution-logs")}
              >
                View Logs
              </button>

              <button
                style={styles.createBtn}
                onClick={() => {
                  setEditingOffer(null);
                  setShowForm(true);
                }}
              >
                + Create Offer
              </button>
            </div>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          {/* TABLE */}
          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Advertiser</th>
                  <th>Geo</th>
                  <th>Carrier</th>
                  <th>Payout</th>
                  <th>Revenue</th>
                  <th>Status</th>
                  <th>Actions</th>
                  <th>Execute</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="10" style={styles.empty}>
                      Loading offers...
                    </td>
                  </tr>
                )}

                {!loading && offers.length === 0 && (
                  <tr>
                    <td colSpan="10" style={styles.empty}>
                      No offers created yet
                    </td>
                  </tr>
                )}

                {!loading &&
                  offers.map((o) => (
                    <tr key={o.id}>
                      <td style={styles.mono}>{o.id}</td>
                      <td>{o.name}</td>
                      <td>{o.advertiser_name || "—"}</td>
                      <td>{o.geo || "—"}</td>
                      <td>{o.carrier || "—"}</td>
                      <td>${o.payout ?? "—"}</td>
                      <td>${o.revenue ?? "—"}</td>

                      <td>
                        <span
                          style={{
                            ...styles.status,
                            background: o.is_active
                              ? "#16a34a"
                              : "#991b1b",
                          }}
                        >
                          {o.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td>
                        <button
                          style={styles.link}
                          onClick={() => setSelectedOffer(o)}
                        >
                          View
                        </button>

                        <button
                          style={styles.edit}
                          onClick={() => {
                            setEditingOffer(o);
                            setShowForm(true);
                          }}
                        >
                          Edit
                        </button>
                      </td>

                      {/* EXECUTE */}
                      <td>
                        <button
                          style={styles.execute}
                          disabled={!o.is_active}
                          onClick={() =>
                            navigate(`/offers/${o.id}/execute`)
                          }
                        >
                          Execute
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* CREATE / EDIT MODAL */}
          {showForm && (
            <OfferForm
              initialData={editingOffer}
              onClose={() => {
                setShowForm(false);
                setEditingOffer(null);
              }}
              onSave={editingOffer ? handleUpdateOffer : handleCreateOffer}
            />
          )}

          {/* CONFIG VIEW */}
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

/* ================= STYLES ================= */

const styles = {
  main: { flex: 1, background: "#020617", minHeight: "100vh" },
  content: { padding: 24, color: "#fff", maxWidth: 1200, margin: "0 auto" },
  headerRow: { display: "flex", justifyContent: "space-between", marginBottom: 20 },
  title: { fontSize: 24 },
  createBtn: { background: "#2563eb", color: "#fff", padding: "10px 18px", borderRadius: 8 },
  logsBtn: { background: "#334155", color: "#fff", padding: "10px 18px", borderRadius: 8 },
  card: { border: "1px solid #1e293b", borderRadius: 12, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "center" },
  mono: { fontFamily: "monospace", fontSize: 12, color: "#93c5fd" },
  status: { padding: "4px 12px", borderRadius: 999, fontSize: 12, color: "#fff" },
  link: { background: "none", border: "none", color: "#38bdf8", cursor: "pointer" },
  edit: { background: "none", border: "none", color: "#facc15", cursor: "pointer", marginLeft: 8 },
  execute: { background: "#16a34a", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6 },
  empty: { padding: 24, color: "#94a3b8" },
  error: { background: "#7f1d1d", padding: 10, borderRadius: 8, marginBottom: 16 },
};
