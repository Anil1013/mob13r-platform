import React, { useEffect, useState } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const API_URL = process.env.REACT_APP_API_URL || "https://backend.mob13r.com/api";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("reports");
  const [reports, setReports] = useState([]);
  const [partners, setPartners] = useState([]);
  const [selectedPartners, setSelectedPartners] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [hourly, setHourly] = useState(false);
  const [chartType, setChartType] = useState("line");

  // ✅ Fetch partners list for filter
  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const res = await axios.get(`${API_URL}/admin/partners`);
        setPartners(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchPartners();
  }, []);

  // ✅ Fetch reports (with optional partner filter)
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/admin/reports`, {
          params: {
            fromDate,
            toDate,
            hourly,
            partners: selectedPartners.join(","),
          },
        });
        setReports(data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load reports");
      }
    };

    fetchReports();
    const interval = setInterval(fetchReports, 600000); // 10 min auto-refresh
    return () => clearInterval(interval);
  }, [fromDate, toDate, hourly, selectedPartners]);

  // ✅ Export CSV
  const exportCSV = () => {
    const csv = [
      ["Date", "Partner", "Clicks", "Conversions", "Revenue", "Payout", "Profit"],
      ...reports.map((r) => [
        r.date,
        r.partner_name || "All Partners",
        r.clicks,
        r.conversions,
        `$${r.revenue.toFixed(2)}`,
        `$${r.payout.toFixed(2)}`,
        `$${r.profit.toFixed(2)}`,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Mob13r_Report.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // ✅ Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Mob13r Platform - Reports", 14, 10);
    doc.autoTable({
      startY: 20,
      head: [["Date", "Partner", "Clicks", "Conversions", "Revenue", "Payout", "Profit"]],
      body: reports.map((r) => [
        r.date,
        r.partner_name || "All",
        r.clicks,
        r.conversions,
        `$${r.revenue.toFixed(2)}`,
        `$${r.payout.toFixed(2)}`,
        `$${r.profit.toFixed(2)}`,
      ]),
    });
    doc.save("Mob13r_Report.pdf");
  };

  // ✅ Reports Section
  const ReportsSection = () => (
    <div style={styles.section}>
      <h2 style={styles.heading}>📊 Reports & Partner Comparison</h2>

      {/* Filters */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />

        {/* Partner Multi-select */}
        <select
          multiple
          value={selectedPartners}
          onChange={(e) =>
            setSelectedPartners(Array.from(e.target.selectedOptions, (opt) => opt.value))
          }
          style={styles.multiSelect}
        >
          <option value="">All Partners</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <label style={{ color: "#94a3b8" }}>
          <input
            type="checkbox"
            checked={hourly}
            onChange={() => setHourly(!hourly)}
            style={{ marginRight: "5px" }}
          />
          Hourly View
        </label>

        <button style={styles.loadBtn} onClick={() => window.location.reload()}>
          Refresh
        </button>
        <button style={styles.exportBtn} onClick={exportCSV}>
          Export CSV
        </button>
        <button style={styles.exportBtn} onClick={exportPDF}>
          Export PDF
        </button>

        {/* Chart toggle */}
        <button
          style={{
            ...styles.exportBtn,
            background: chartType === "bar" ? "#22d3ee" : "#1e293b",
            color: chartType === "bar" ? "#0b1221" : "#4cc9f0",
          }}
          onClick={() => setChartType(chartType === "line" ? "bar" : "line")}
        >
          Switch to {chartType === "line" ? "Bar" : "Line"} Chart
        </button>
      </div>
<div className="mt-6 mb-4 border-b border-gray-700 pb-2">
  <h2 className="text-xl font-semibold text-cyan-400">Reports</h2>
</div>

     {/* Table */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Partner</th>
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
                <td>{r.partner_name || "All"}</td>
                <td>{r.clicks}</td>
                <td style={{ color: "#4cc9f0", fontWeight: "bold" }}>{r.conversions}</td>
                <td>${r.revenue.toFixed(2)}</td>
                <td>${r.payout.toFixed(2)}</td>
                <td style={{ color: "#22d3ee" }}>${r.profit.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <ToastContainer position="top-right" theme="dark" />
      <nav style={styles.navbar}>
        <h1 style={styles.title}>Mob13r Admin Dashboard</h1>
        <div style={styles.navLinks}>
          {["reports", "affiliates", "partners", "offers"].map((tab) => (
            <button
              key={tab}
              style={{ ...styles.navButton, ...(activeTab === tab ? styles.activeTab : {}) }}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </nav>

      {activeTab === "reports" && <ReportsSection />}

      <footer style={styles.footer}>
        <p>© 2025 Mob13r Platform — All rights reserved</p>
      </footer>
    </div>
  );
}

// ================= STYLES =================
const styles = {
  container: {
    backgroundColor: "#0b1221",
    color: "#e6eef8",
    minHeight: "100vh",
    fontFamily: "system-ui, sans-serif",
  },
  navbar: {
    background: "#111b34",
    padding: "20px 40px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #1e2a47",
  },
  title: { fontSize: "1.5rem", color: "#4cc9f0" },
  navLinks: { display: "flex", gap: 25 },
  navButton: {
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    fontSize: "1rem",
    cursor: "pointer",
    padding: "6px 12px",
  },
  activeTab: { color: "#4cc9f0", borderBottom: "2px solid #4cc9f0" },
  section: { padding: 40 },
  heading: { fontSize: "1.3rem", color: "#4cc9f0", marginBottom: 10 },
  loadBtn: {
    background: "#4cc9f0",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    color: "#0b1221",
    fontWeight: "bold",
  },
  exportBtn: {
    background: "#1e293b",
    border: "1px solid #4cc9f0",
    color: "#4cc9f0",
    padding: "8px 14px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  multiSelect: {
    background: "#1e293b",
    border: "1px solid #4cc9f0",
    color: "#e2e8f0",
    borderRadius: "6px",
    padding: "6px",
    minWidth: "160px",
    height: "80px",
  },
  tableWrapper: {
    overflowX: "auto",
    background: "#0e162b",
    borderRadius: 8,
    padding: 10,
  },
  table: { width: "100%", borderCollapse: "collapse", color: "#cbd5e1" },
  footer: {
    textAlign: "center",
    borderTop: "1px solid #1e2a47",
    paddingTop: 15,
    color: "#64748b",
    fontSize: ".85rem",
    marginTop: 40,
  },
};
