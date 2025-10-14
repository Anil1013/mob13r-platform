import React, { useState, useEffect } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "https://backend.mob13r.com/api";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("reports");
  const [partners, setPartners] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    (async () => {
      const [p, a, o] = await Promise.all([
        axios.get(`${API_URL}/admin/partners`),
        axios.get(`${API_URL}/admin/affiliates`),
        axios.get(`${API_URL}/admin/offers`),
      ]);
      setPartners(p.data);
      setAffiliates(a.data);
      setOffers(o.data);
    })();
  }, []);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Mob13r Admin Dashboard</h1>

      <nav style={styles.navbar}>
        {["reports", "affiliates", "partners", "offers"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.navButton,
              ...(activeTab === tab ? styles.activeTab : {}),
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      {activeTab === "reports" && (
        <ReportsSection
          partners={partners}
          affiliates={affiliates}
          offers={offers}
        />
      )}
    </div>
  );
}

/* ---------------- REPORTS SECTION ---------------- */

const ReportsSection = ({ partners, affiliates, offers }) => {
  const [filters, setFilters] = useState({
    start_date: "",
    end_date: "",
    start_hour: "",
    end_hour: "",
    partner_id: "",
    affiliate_id: "",
    offer_id: "",
    group: "daily",
  });
  const [reports, setReports] = useState([]);

  const fetchReports = async () => {
    const params = new URLSearchParams(filters).toString();
    const { data } = await axios.get(`${API_URL}/admin/reports?${params}`);
    setReports(data);
  };

  return (
    <div style={styles.section}>
      <h2 style={styles.heading}>📊 Reports</h2>

      {/* FILTERS */}
      <div style={styles.filterBox}>
        <input
          type="date"
          value={filters.start_date}
          onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
          style={styles.filterInput}
        />
        <input
          type="date"
          value={filters.end_date}
          onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
          style={styles.filterInput}
        />

        <select
          value={filters.partner_id}
          onChange={(e) => setFilters({ ...filters, partner_id: e.target.value })}
          style={styles.filterInput}
        >
          <option value="">All Partners</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={filters.affiliate_id}
          onChange={(e) =>
            setFilters({ ...filters, affiliate_id: e.target.value })
          }
          style={styles.filterInput}
        >
          <option value="">All Affiliates</option>
          {affiliates.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <select
          value={filters.offer_id}
          onChange={(e) => setFilters({ ...filters, offer_id: e.target.value })}
          style={styles.filterInput}
        >
          <option value="">All Offers</option>
          {offers.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>

        <label style={{ color: "#4cc9f0" }}>
          <input
            type="checkbox"
            checked={filters.group === "hourly"}
            onChange={(e) =>
              setFilters({
                ...filters,
                group: e.target.checked ? "hourly" : "daily",
              })
            }
          />{" "}
          Hourly View
        </label>

        {filters.group === "hourly" && (
          <>
            <select
              value={filters.start_hour}
              onChange={(e) =>
                setFilters({ ...filters, start_hour: e.target.value })
              }
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
              value={filters.end_hour}
              onChange={(e) =>
                setFilters({ ...filters, end_hour: e.target.value })
              }
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

      {/* TABLE */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              {filters.group === "hourly" && <th>Hour</th>}
              <th>Clicks</th>
              <th>Conversions</th>
              <th>Revenue</th>
              <th>Payout</th>
              <th>Profit</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r, i) => (
              <tr key={i}>
                <td>{r.date}</td>
                {filters.group === "hourly" && <td>{r.hour}:00</td>}
                <td>{r.clicks}</td>
                <td>{r.conversions}</td>
                <td>${r.revenue}</td>
                <td>${r.payout}</td>
                <td style={{ color: "#4cc9f0" }}>${r.profit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ---------------- STYLES ---------------- */
const styles = {
  container: { background: "#0b1221", color: "#e6eef8", minHeight: "100vh", padding: 30 },
  title: { color: "#4cc9f0", fontSize: "1.8rem", marginBottom: 20 },
  navbar: { display: "flex", gap: 20, marginBottom: 20, borderBottom: "1px solid #1e2a47" },
  navButton: { background: "none", border: "none", color: "#94a3b8", fontSize: "1rem", cursor: "pointer" },
  activeTab: { color: "#4cc9f0", borderBottom: "2px solid #4cc9f0" },
  section: { background: "#0e162b", padding: 20, borderRadius: 8 },
  heading: { color: "#4cc9f0", fontSize: "1.2rem", marginBottom: 10 },
  filterBox: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20, background: "#111b34", padding: 10, borderRadius: 8 },
  filterInput: { background: "#0b1221", color: "#fff", border: "1px solid #4cc9f0", padding: "6px 10px", borderRadius: 6 },
  loadBtn: { background: "#4cc9f0", color: "#0b1221", border: "none", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontWeight: "bold" },
  tableWrapper: { overflowX: "auto", background: "#0b1221", borderRadius: 8 },
  table: { width: "100%", borderCollapse: "collapse", color: "#fff" },
};
