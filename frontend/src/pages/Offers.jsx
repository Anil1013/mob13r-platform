import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import { useNavigate } from "react-router-dom";

export default function Offers() {
  const navigate = useNavigate();

  const [offers] = useState([
    {
      id: "OFF-1001",
      name: "Shemaroo Weekly",
      geo: "Kuwait",
      carrier: "Zain",
      payout: 0.5,
      revenue: 1.2,
      status: "Active",
      method: "POST",
    },
    {
      id: "OFF-1002",
      name: "Zain Sports",
      geo: "Kuwait",
      carrier: "Zain",
      payout: 0.7,
      revenue: 1.5,
      status: "Paused",
      method: "GET",
    },
  ]);

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div style={styles.main}>
        <Header />

        <div style={styles.content}>
          <div style={styles.topBar}>
            <h2>Offers</h2>
            <button style={styles.createBtn} onClick={() => navigate("/offers/create")}>
              + Create Offer
            </button>
          </div>

          <table style={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Geo</th>
                <th>Carrier</th>
                <th>Payout</th>
                <th>Revenue</th>
                <th>Method</th>
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
                  <td>{o.method}</td>
                  <td>
                    <span
                      style={{
                        ...styles.status,
                        background: o.status === "Active" ? "#16a34a" : "#ca8a04",
                      }}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td>
                    <button
                      style={styles.link}
                      onClick={() => navigate(`/offers/${o.id}/config`)}
                    >
                      Configure
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  main: { flex: 1, background: "#020617", minHeight: "100vh" },
  content: { padding: "24px", color: "#fff" },
  topBar: { display: "flex", justifyContent: "space-between", marginBottom: "20px" },
  createBtn: {
    background: "#2563eb",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  status: {
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    color: "#fff",
  },
  link: {
    background: "transparent",
    border: "1px solid #38bdf8",
    color: "#38bdf8",
    padding: "6px 10px",
    borderRadius: "6px",
    cursor: "pointer",
  },
};
