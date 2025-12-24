import { useEffect, useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

import { getExecutionLogs } from "../services/executions";

export default function OfferExecutionLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    offer_id: "",
    transaction_id: "",
  });

  /* ================= LOAD LOGS ================= */
  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await getExecutionLogs(filters);
      setLogs(data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load execution logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  /* ================= FILTER CHANGE ================= */
  const handleChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div style={styles.main}>
        <Header />

        <div style={styles.content}>
          <h2 style={styles.title}>Offer Execution Logs</h2>
          <p style={styles.sub}>
            Debug status-check, PIN send & PIN verify flows
          </p>

          {/* FILTERS */}
          <div style={styles.filters}>
            <input
              placeholder="Offer ID"
              name="offer_id"
              value={filters.offer_id}
              onChange={handleChange}
              style={styles.input}
            />

            <input
              placeholder="Transaction ID"
              name="transaction_id"
              value={filters.transaction_id}
              onChange={handleChange}
              style={styles.input}
            />

            <button style={styles.btn} onClick={loadLogs}>
              Apply
            </button>
          </div>

          {/* TABLE */}
          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Offer</th>
                  <th>Step</th>
                  <th>Status</th>
                  <th>Transaction</th>
                  <th>Time</th>
                  <th>Details</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="7" style={styles.empty}>
                      Loading logs...
                    </td>
                  </tr>
                )}

                {!loading && logs.length === 0 && (
                  <tr>
                    <td colSpan="7" style={styles.empty}>
                      No execution logs found
                    </td>
                  </tr>
                )}

                {!loading &&
                  logs.map((l) => (
                    <tr key={l.id}>
                      <td style={styles.mono}>{l.id}</td>
                      <td>{l.offer_id}</td>
                      <td>{l.step}</td>
                      <td>
                        <span
                          style={{
                            ...styles.badge,
                            background:
                              l.status === "success"
                                ? "#16a34a"
                                : "#dc2626",
                          }}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td style={styles.mono}>{l.transaction_id}</td>
                      <td>
                        {new Date(l.created_at).toLocaleString()}
                      </td>
                      <td>
                        <details>
                          <summary style={styles.link}>
                            View
                          </summary>

                          <pre style={styles.pre}>
REQUEST:
{JSON.stringify(l.request_payload, null, 2)}

RESPONSE:
{JSON.stringify(l.response_payload, null, 2)}

ERROR:
{l.error || "—"}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {error && <div style={styles.error}>{error}</div>}
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
    padding: 24,
    color: "#fff",
    maxWidth: "1300px",
    margin: "0 auto",
  },
  title: {
    fontSize: 26,
  },
  sub: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 16,
  },
  filters: {
    display: "flex",
    gap: 12,
    marginBottom: 20,
  },
  input: {
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #1e293b",
    background: "#020617",
    color: "#fff",
  },
  btn: {
    background: "#2563eb",
    border: "none",
    borderRadius: 6,
    color: "#fff",
    padding: "8px 16px",
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
  badge: {
    padding: "4px 10px",
    borderRadius: 999,
    color: "#fff",
    fontSize: 12,
    fontWeight: 600,
  },
  link: {
    cursor: "pointer",
    color: "#38bdf8",
    fontWeight: 600,
  },
  pre: {
    marginTop: 10,
    background: "#020617",
    padding: 12,
    borderRadius: 8,
    fontSize: 12,
    textAlign: "left",
    color: "#e5e7eb",
    maxHeight: 300,
    overflow: "auto",
  },
  empty: {
    padding: 24,
    color: "#94a3b8",
    textAlign: "center",
  },
  error: {
    marginTop: 16,
    background: "#7f1d1d",
    padding: 10,
    borderRadius: 8,
    color: "#fecaca",
  },
};
