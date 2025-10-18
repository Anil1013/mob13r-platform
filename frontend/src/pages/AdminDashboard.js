import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import "../styles/AdminDashboard.css";

const AdminDashboard = () => {
  const [reportData, setReportData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [filters, setFilters] = useState({
    partner: "",
    affiliate: "",
    startDate: "",
    endDate: "",
  });
  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    partner_service_id: true,
    publisher_campaign_id: true,
    partner: true,
    affiliate: true,
    geo: true,
    carrier: true,
    partner_service_name: true,
    clicks: true,
    partner_conversions: true,
    affiliate_conversions: true,
    revenue: true,
    cost_to_affiliate: true,
    profit: true,
  });
  const [timer, setTimer] = useState(600); // 10 minutes countdown

  // ===========================
  // 🧠 Fetch Reports
  // ===========================
  const fetchData = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/admin/reports`
      );
      setReportData(response.data);
      setFilteredData(response.data);
    } catch (error) {
      console.error("Fetch error:", error.message || error);
    }
  };

  // ===========================
  // ⏱ Auto Refresh + Timer
  // ===========================
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          fetchData();
          return 600;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  // ===========================
  // 🔍 Filters
  // ===========================
  const applyFilters = () => {
    let filtered = reportData;
    if (filters.partner)
      filtered = filtered.filter((r) =>
        r.partner?.toLowerCase().includes(filters.partner.toLowerCase())
      );
    if (filters.affiliate)
      filtered = filtered.filter((r) =>
        r.affiliate?.toLowerCase().includes(filters.affiliate.toLowerCase())
      );
    if (filters.startDate)
      filtered = filtered.filter(
        (r) => new Date(r.date) >= new Date(filters.startDate)
      );
    if (filters.endDate)
      filtered = filtered.filter(
        (r) => new Date(r.date) <= new Date(filters.endDate)
      );
    setFilteredData(filtered);
  };

  // ===========================
  // 📊 Totals (Memoized)
  // ===========================
  const totals = useMemo(() => {
    const totalClicks = filteredData.reduce(
      (s, r) => s + (parseInt(r.clicks) || 0),
      0
    );
    const totalPartnerConv = filteredData.reduce(
      (s, r) => s + (parseInt(r.partner_conversions) || 0),
      0
    );
    const totalAffiliateConv = filteredData.reduce(
      (s, r) => s + (parseInt(r.affiliate_conversions) || 0),
      0
    );
    const totalRevenue = filteredData.reduce(
      (s, r) => s + (parseFloat(r.revenue) || 0),
      0
    );
    const totalCost = filteredData.reduce(
      (s, r) => s + (parseFloat(r.cost_to_affiliate) || 0),
      0
    );
    const totalProfit = filteredData.reduce(
      (s, r) => s + (parseFloat(r.profit) || 0),
      0
    );
    return {
      totalClicks,
      totalPartnerConv,
      totalAffiliateConv,
      totalRevenue,
      totalCost,
      totalProfit,
    };
  }, [filteredData]);

  // ===========================
  // 📤 Export Handlers
  // ===========================
  const exportToCSV = () => {
    const headers = Object.keys(visibleColumns).filter((k) => visibleColumns[k]);
    const csvRows = [
      headers.join(","),
      ...filteredData.map((r) =>
        headers.map((col) => JSON.stringify(r[col] || "")).join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    saveAs(blob, "mob13r_report.csv");
  };

  const exportToExcel = () => {
    const visibleData = filteredData.map((r) => {
      const obj = {};
      for (const key in visibleColumns)
        if (visibleColumns[key]) obj[key] = r[key];
      return obj;
    });
    const sheet = XLSX.utils.json_to_sheet(visibleData);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Report");
    XLSX.writeFile(book, "mob13r_report.xlsx");
  };

  const toggleColumn = (key) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ===========================
  // 🖥️ Render UI
  // ===========================
  return (
    <div className="admin-dashboard">
      {/* ================== TOP SECTION ================== */}
      <div className="dashboard-top">
        <div className="auto-refresh-left">
          ⏱️ Auto-refresh in {formatTime(timer)}
        </div>

        <h2 className="dashboard-title">📊 Mob13r Performance Dashboard</h2>

        <div className="navbar-area">
          <button className="navbar-button">Partners</button>
          <button className="navbar-button">Affiliates</button>
          <button className="navbar-button">Services</button>
          <button className="navbar-button">Reports</button>
        </div>
      </div>

      {/* ================== FILTER SECTION ================== */}
      <div className="filters">
        <select
          value={filters.partner}
          onChange={(e) => setFilters({ ...filters, partner: e.target.value })}
        >
          <option value="">All Partners</option>
          {[...new Set(reportData.map((r) => r.partner))].map((p, i) => (
            <option key={i} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          value={filters.affiliate}
          onChange={(e) => setFilters({ ...filters, affiliate: e.target.value })}
        >
          <option value="">All Affiliates</option>
          {[...new Set(reportData.map((r) => r.affiliate))].map((a, i) => (
            <option key={i} value={a}>
              {a}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
        />

        <button onClick={applyFilters}>Apply Filters</button>
        <button onClick={fetchData}>🔄 Refresh</button>

        <div className="column-toggle">
          <span>👁️ Columns</span>
          <div className="column-dropdown">
            {Object.keys(visibleColumns).map((key) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={visibleColumns[key]}
                  onChange={() => toggleColumn(key)}
                />
                {key.replaceAll("_", " ").toUpperCase()}
              </label>
            ))}
          </div>
        </div>

        <button onClick={exportToCSV}>📄 CSV</button>
        <button onClick={exportToExcel}>📘 Excel</button>
      </div>

      {/* ================== REPORT TABLE ================== */}
      <table className="report-table">
        <thead>
          <tr>
            {Object.keys(visibleColumns).map(
              (key) =>
                visibleColumns[key] && (
                  <th key={key}>{key.replaceAll("_", " ").toUpperCase()}</th>
                )
            )}
          </tr>
        </thead>
        <tbody>
          {filteredData.map((row, i) => (
            <tr key={i}>
              {Object.keys(visibleColumns).map(
                (key) =>
                  visibleColumns[key] && (
                    <td
                      key={key}
                      style={
                        key === "profit"
                          ? {
                              color:
                                parseFloat(row.profit) >= 0
                                  ? "#00ff80"
                                  : "#ff4d4d",
                              fontWeight: "bold",
                            }
                          : {}
                      }
                    >
                      {row[key]}
                    </td>
                  )
              )}
            </tr>
          ))}

          {/* ================== TOTAL ROW ================== */}
          <tr className="total-row">
            <td colSpan={8}>Total</td>
            {visibleColumns.clicks && <td>{totals.totalClicks}</td>}
            {visibleColumns.partner_conversions && (
              <td>{totals.totalPartnerConv}</td>
            )}
            {visibleColumns.affiliate_conversions && (
              <td>{totals.totalAffiliateConv}</td>
            )}
            {visibleColumns.revenue && (
              <td>${totals.totalRevenue.toFixed(2)}</td>
            )}
            {visibleColumns.cost_to_affiliate && (
              <td>${totals.totalCost.toFixed(2)}</td>
            )}
            {visibleColumns.profit && (
              <td
                style={{
                  color: "#ff4d4d",
                  fontWeight: "bold",
                }}
              >
                ${totals.totalProfit.toFixed(2)}
              </td>
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default AdminDashboard;
