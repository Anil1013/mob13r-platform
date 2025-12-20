import { useEffect, useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import {
  getAdvertisers,
  createAdvertiser,
  toggleAdvertiserStatus,
  deleteAdvertiser,
} from "../services/advertisers";

export default function Advertisers() {
  const [advertisers, setAdvertisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });

  /* ================= LOAD DATA ================= */
  const loadAdvertisers = async () => {
    try {
      const data = await getAdvertisers();
      setAdvertisers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdvertisers();
  }, []);

  /* ================= HANDLERS ================= */
  const handleCreate = async (e) => {
    e.preventDefault();
    await createAdvertiser(form);
    setForm({ name: "", email: "" });
    setShowModal(false);
    loadAdvertisers();
  };

  const handleToggle = async (id) => {
    await toggleAdvertiserStatus(id);
    loadAdvertisers();
  };

  const handleDelete = async (id) => {
    if (confirm("Delete advertiser?")) {
      await deleteAdvertiser(id);
      loadAdvertisers();
    }
  };

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div style={styles.main}>
        <Header />

        <div style={styles.content}>
          <div style={styles.topRow}>
            <div>
              <h2 style={styles.title}>Advertisers</h2>
              <p style={styles.subtitle}>
                Manage advertisers, brands, and partners
              </p>
            </div>

            <button onClick={() => setShowModal(true)} style={styles.addBtn}>
              + Add Advertiser
            </button>
          </div>

          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="4" style={styles.empty}>Loading…</td>
                  </tr>
                )}

                {!loading && advertisers.length === 0 && (
                  <tr>
                    <td colSpan="4" style={styles.empty}>
                      No advertisers found
                    </td>
                  </tr>
                )}

                {advertisers.map((a) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td>{a.email}</td>
                    <td>
                      <span
                        style={{
                          ...styles.status,
                          background:
                            a.status === "Active" ? "#16a34a" : "#ca8a04",
                        }}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td>
                      <button
                        style={styles.action}
                        onClick={() => handleToggle(a.id)}
                      >
                        Toggle
                      </button>
                      <button
                        style={{ ...styles.action, color: "#dc2626" }}
                        onClick={() => handleDelete(a.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ================= MODAL ================= */}
      {showModal && (
        <div style={styles.overlay}>
          <form style={styles.modal} onSubmit={handleCreate}>
            <h3>Add Advertiser</h3>

            <input
              placeholder="Advertiser Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

            <input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />

            <div style={styles.modalActions}>
              <button type="button" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button type="submit">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  main: { flex: 1, background: "#020617", minHeight: "100vh" },
  content: { padding: 24, color: "#fff" },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: { fontSize: 26 },
  subtitle: { color: "#94a3b8" },
  addBtn: {
    background: "#2563eb",
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  card: {
    border: "1px solid #1e293b",
    borderRadius: 12,
    overflow: "hidden",
  },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "center" },
  status: {
    padding: "4px 12px",
    borderRadius: 999,
    fontSize: 12,
    color: "#fff",
  },
  action: {
    background: "none",
    border: "none",
    color: "#38bdf8",
    cursor: "pointer",
    marginRight: 12,
  },
  empty: { padding: 24, color: "#94a3b8" },

  /* MODAL */
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modal: {
    background: "#020617",
    padding: 24,
    borderRadius: 12,
    width: 360,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  modalActions: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 12,
  },
};
