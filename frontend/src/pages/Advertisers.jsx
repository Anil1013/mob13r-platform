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
  const [saving, setSaving] = useState(false);

  /* ================= LOAD DATA ================= */
  const loadAdvertisers = async () => {
    try {
      const data = await getAdvertisers();
      setAdvertisers(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load advertisers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdvertisers();
  }, []);

  /* ================= ACTIONS ================= */
  const handleToggle = async (id) => {
    try {
      await toggleAdvertiserStatus(id);
      loadAdvertisers();
    } catch {
      alert("Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this advertiser?")) return;

    try {
      await deleteAdvertiser(id);
      loadAdvertisers();
    } catch {
      alert("Failed to delete advertiser");
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await createAdvertiser(form);
      setForm({ name: "", email: "" });
      setShowModal(false);
      loadAdvertisers();
    } catch (err) {
      alert("Failed to create advertiser");
    } finally {
      setSaving(false);
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
                Manage advertisers, brands, and partners here.
              </p>
            </div>

            <button style={styles.addBtn} onClick={() => setShowModal(true)}>
              + Add Advertiser
            </button>
          </div>

          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="4" style={styles.empty}>
                      Loading advertisers…
                    </td>
                  </tr>
                )}

                {!loading && advertisers.length === 0 && (
                  <tr>
                    <td colSpan="4" style={styles.empty}>
                      No advertisers found
                    </td>
                  </tr>
                )}

                {!loading &&
                  advertisers.map((a) => (
                    <tr key={a.id}>
                      <td style={styles.td}>{a.name}</td>
                      <td style={styles.td}>{a.email}</td>

                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.status,
                            background:
                              a.status === "Active"
                                ? "#16a34a"
                                : "#ca8a04",
                          }}
                        >
                          {a.status}
                        </span>
                      </td>

                      <td style={styles.td}>
                        <button
                          style={styles.actionBtn}
                          onClick={() => handleToggle(a.id)}
                        >
                          Toggle
                        </button>

                        <button
                          style={{ ...styles.actionBtn, color: "#dc2626" }}
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
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              required
            />

            <input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
              required
            />

            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES (UNCHANGED DESIGN) ================= */

const styles = {
  main: { flex: 1, background: "#020617", minHeight: "100vh" },
  content: { padding: "24px", color: "#fff" },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  title: { fontSize: "26px", marginBottom: "4px" },
  subtitle: { color: "#94a3b8" },
  addBtn: {
    background: "#2563eb",
    border: "none",
    padding: "10px 16px",
    borderRadius: "8px",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  card: {
    background: "#020617",
    border: "1px solid #1e293b",
    borderRadius: "12px",
    overflow: "hidden",
  },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "center" },
  th: {
    padding: "14px",
    fontSize: "13px",
    color: "#94a3b8",
    borderBottom: "1px solid #1e293b",
  },
  td: {
    padding: "14px",
    fontSize: "14px",
    borderBottom: "1px solid #1e293b",
  },
  status: {
    padding: "4px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    color: "#fff",
  },
  actionBtn: {
    background: "transparent",
    border: "none",
    color: "#38bdf8",
    cursor: "pointer",
    marginRight: "12px",
    fontWeight: 600,
  },
  empty: {
    padding: "24px",
    color: "#94a3b8",
    textAlign: "center",
  },

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
    padding: "24px",
    borderRadius: "12px",
    width: "360px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    color: "#fff",
  },
  modalActions: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "12px",
  },
};
