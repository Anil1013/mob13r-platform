import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

export default function Advertisers() {
  const [advertisers, setAdvertisers] = useState([
    {
      id: 1,
      name: "Shemaroo",
      email: "ops@shemaroo.com",
      status: "Active",
      createdAt: "01 Nov 2024",
    },
    {
      id: 2,
      name: "Zain Kuwait",
      email: "api@zain.com",
      status: "Paused",
      createdAt: "18 Oct 2024",
    },
  ]);

  const toggleStatus = (id) => {
    setAdvertisers((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: a.status === "Active" ? "Paused" : "Active" }
          : a
      )
    );
  };

  const deleteAdvertiser = (id) => {
    if (confirm("Are you sure you want to delete this advertiser?")) {
      setAdvertisers((prev) => prev.filter((a) => a.id !== id));
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

            <button style={styles.addBtn}>+ Add Advertiser</button>
          </div>

          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {advertisers.map((a) => (
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

                    <td style={styles.td}>{a.createdAt}</td>

                    <td style={styles.td}>
                      <button
                        style={styles.actionBtn}
                        onClick={() => toggleStatus(a.id)}
                      >
                        Toggle
                      </button>

                      <button
                        style={{ ...styles.actionBtn, color: "#dc2626" }}
                        onClick={() => deleteAdvertiser(a.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {advertisers.length === 0 && (
                  <tr>
                    <td colSpan="5" style={styles.empty}>
                      No advertisers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  title: {
    fontSize: "26px",
    marginBottom: "4px",
  },
  subtitle: {
    color: "#94a3b8",
  },
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
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "center",
  },
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
    verticalAlign: "middle",
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
};
