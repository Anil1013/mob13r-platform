import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "https://backend.mob13r.com/api";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("reports");
  const [affiliates, setAffiliates] = useState([]);
  const [partners, setPartners] = useState([]);
  const [offers, setOffers] = useState([]);

  // Load data for dropdowns
  useEffect(() => {
    (async () => {
      try {
        const [a, p, o] = await Promise.all([
          axios.get(`${API_URL}/admin/affiliates`),
          axios.get(`${API_URL}/admin/partners`),
          axios.get(`${API_URL}/admin/offers`),
        ]);
        setAffiliates(a.data);
        setPartners(p.data);
        setOffers(o.data);
      } catch (err) {
        console.error("Failed to load initial data:", err);
      }
    })();
  }, []);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Mob13r Admin Dashboard</h1>

      {/* Navbar */}
      <nav style={styles.navbar}>
        {["reports", "affiliates", "partners", "offers"].map((tab) => (
          <button
            key={tab}
            style={{
              ...styles.navButton,
              ...(activeTab === tab ? styles.activeTab : {}),
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      {/* Reports Tab */}
      {activeTab === "reports" && <ReportsSection />}

      <footer style={styles.footer}>
        © 2025 Mob13r Platform — All rights reserved
      </footer>
    </div>
  );
}

/* ----------------- REPORTS SECTION ------------------ */
const ReportsSection = () => {
  const [reports, setReports] = useState([]);
  const [hourly, setHourly] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startHour, setStartHour] = useState("");
  const [endHour, setEndHour] = useState("");

  const fetchReports = async () => {
    try {
      let url = `${API_URL}/admin/reports?group=${hourly ? "hourly" : "daily"}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      if (hourly && startHour && endHour)
        url += `&start_hour=${startHour}&end_hour=${endHour}`;

      const { data } = await axios.get(url);
      setReports(data);
    } catch (err) {
      console.error("Error fetching reports:", err);
    }
  };

  return (
    <div style={styles.section}>
      <h2 style={styles.heading}>
        {hourly ? "Hourly Reports" : "Day-wise Reports"}
      </h2>

      {/* Filters */}
      <div style={styles.filterBox}>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={styles.filterInput}
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={styles.filterInput}
        />

        <label style={{ color: "#4cc9f0" }}>
          <input
            type="checkbox"
            checked={hourly}
            onChange={() => setHourly(!hourly)}
          />{" "}
          Hourly View
        </label>

        {hourly && (
          <>
            <select
              value={startHour}
              onChange={(e) => setStartHour(e.target.value)}
              style={styles.filterInput}
            >
              <option value="">Start Hour</option>
              {[...Array(24).keys()].map((h) => (
                <option key={h} value={h}>
                  {h}:00
                </option>
              ))}
            </select>
            <select
              value={endHour}
              onChange={(e) => setEndHour(e.target.value)}
              style={styles.filterInput}
            >
              <option value="">End Hour</option>
              {[...Array(24).keys()].map((h) => (
                <option key={h} value={h}>
                  {h}:00
                </option>
              ))}
            </select>
          </>
        )}

        <button onClick={fetchReports} style={styles.loadBtn}>
          Load
        </button>
      </div>

      {/* Table */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              {hourly && <th>Hour</th>}
              <th>Total Affiliates</th>
              <th>Total Partners</th>
              <th>Total Offers</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r, i) => (
              <tr key={i}>
                <td>{r.date}</td>
                {hourly && <td>{r.hour}:00</td>}
                <td>{r.total_affiliates}</td>
                <td>{r.total_partners}</td>
                <td>{r.total_offers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ----------------- STYLES ------------------ */
const styles = {
  container: {
    backgroundColor: "#0b1221",
    color: "#e6eef8",
    minHeight: "100vh",
    fontFamily: "system-ui, sans-serif",
    padding: 30,
  },
  title: { fontSize: "1.8rem", color: "#4cc9f0", marginBottom: 20 },
  navbar: {
    display: "flex",
    gap: 20,
    marginBottom: 20,
    borderBottom: "1px solid #1e2a47",
    paddingBottom: 10,
  },
  navButton: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "1rem",
  },
  activeTab: { color: "#4cc9f0", borderBottom: "2px solid #4cc9f0" },
  section: { background: "#0e162b", padding: 20, borderRadius: 8 },
  heading: { fontSize: "1.3rem", color: "#4cc9f0", marginBottom: 10 },
  filterBox: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    background: "#111b34",
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  filterInput: {
    background: "#0b1221",
    color: "#fff",
    border: "1px solid #4cc9f0",
    padding: "6px 10px",
    borderRadius: 6,
  },
  loadBtn: {
    background: "#4cc9f0",
    color: "#0b1221",
    border: "none",
    padding: "8px 14px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: "bold",
  },
  tableWrapper: {
    overflowX: "auto",
    background: "#0b1221",
    borderRadius: 8,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  footer: {
    marginTop: 40,
    borderTop: "1px solid #1e2a47",
    textAlign: "center",
    paddingTop: 10,
    fontSize: "0.9rem",
    color: "#64748b",
  },
};
