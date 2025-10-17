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
    partner_id: true,
    affiliate_id: true,
    partner: true,
    affiliate: true,
    geo: true,
    carrier: true,
    clicks: true,
    conversions: true,
    revenue: true,
  });

  const [timer, setTimer] = useState(600); // 600s = 10 minutes
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 🔁 Fetch report data from backend
  const fetchData = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/admin/reports`
      );
      setReportData(response.data);
      setFilteredData(response.data);
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
  };

  // 🔁 Auto-refresh timer logic
  useEffect(() => {
    fetchData(); // initial load

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          fetchData();
          return 600; // reset timer
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // 🧠 Apply Filters
  const applyFilters = () => {
    let filtered = reportData;

    if (filters.partner)
      filtered = filtered.filter(
        (row) =>
          row.partner?.toLowerCase().includes(filters.partner.toLowerCase())
      );

    if (filters.affiliate)
      filtered = filtered.filter(
        (row) =>
          row.affiliate?.toLowerCase().includes(filters.affiliate.toLowerCase())
      );

    if (filters.startDate)
      filtered = filtered.filter(
        (row) => new Date(row.date) >= new Date(filters.startDate)
      );

    if (filters.endDate)
      filtered = filtered.filter(
        (row) => new Date(row.date) <= new Date(filters.endDate)
      );

    setFilteredData(filtered);
  };

  // 🧮 Totals row
  const totals = useMemo(() => {
    const totalClicks = filteredData.reduce(
      (sum, row) => sum + (parseInt(row.clicks) || 0),
      0
    );
    const totalConversions = filteredData.reduce(
      (sum, row) => sum + (parseInt(row.conversions) || 0),
      0
    );
    const totalRevenue = filteredData.reduce(
      (sum, row) => sum + (parseFloat(row.revenue) || 0),
      0
    );

    return { totalClicks, totalConversions, totalRevenue };
  }, [filteredData]);

  // 📦 Export as CSV
  const exportToCSV = () => {
    const headers = Object.keys(visibleColumns).filter(
      (col) => visibleColumns[col]
    );

    const csvRows = [
      headers.join(","),
      ...filteredData.map((row) =>
        headers.map((col) => JSON.stringify(row[col] || "")).join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    saveAs(blob, "mob13r_report.csv");
  };

  // 📘 Export as Excel
  const exportToExcel = () => {
    const visibleData = filteredData.map((row) => {
      const filteredRow = {};
      for (const key in visibleColumns) {
        if (visibleColumns[key]) filteredRow[key] = row[key];
      }
      return filteredRow;
    });
    const worksheet = XLSX.utils.json_to_sheet(visibleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, "mob13r_report.xlsx");
  };

  // 🔍 Toggle visible columns
  const toggleColumn = (key) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="admin-dashboard">
      <h2>📊 Mob13r Performance Dashboard</h2>

      <div className="filters">
        {/* Auto Refresh Timer */}
        <div className="auto-refresh">
          <span className="icon">⏱️</span> Auto-refresh in {formatTime(timer)}
        </div>

        {/* Partner Filter */}
        <select
          value={filters.partner}
          onChange={(e) =>
            setFilters({ ...filters, partner: e.target.value })
          }
        >
          <option value="">All Partners</option>
          {[...new Set(reportData.map((r) => r.partner))].map((partner, i) => (
            <option key={i} value={partner}>
              {partner}
            </option>
          ))}
        </select>

        {/* Affiliate Filter */}
        <select
          value={filters.affiliate}
          onChange={(e) =>
            setFilters({ ...filters, affiliate: e.target.value })
          }
        >
          <option value="">All Affiliates</option>
          {[...new Set(reportData.map((r) => r.affiliate))].map(
            (affiliate, i) => (
              <option key={i} value={affiliate}>
                {affiliate}
              </option>
            )
          )}
        </select>

        {/* Date Range */}
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) =>
            setFilters({ ...filters, startDate: e.target.value })
          }
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) =>
            setFilters({ ...filters, endDate: e.target.value })
          }
        />

        <button onClick={applyFilters}>Apply Filters</button>
        <button onClick={fetchData}>🔄 Refresh</button>

        {/* Show/Hide Columns */}
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
                {key.replace("_", " ").toUpperCase()}
              </label>
            ))}
          </div>
        </div>

        <button onClick={exportToCSV}>📄 Export CSV</button>
        <button onClick={exportToExcel}>📘 Export Excel</button>
      </div>

      <table className="report-table">
        <thead>
          <tr>
            {Object.keys(visibleColumns).map(
              (key) =>
                visibleColumns[key] && (
                  <th key={key}>{key.replace("_", " ").toUpperCase()}</th>
                )
            )}
          </tr>
        </thead>
        <tbody>
          {filteredData.map((row, index) => (
            <tr key={index}>
              {Object.keys(visibleColumns).map(
                (key) =>
                  visibleColumns[key] && <td key={key}>{row[key]}</td>
              )}
            </tr>
          ))}
          <tr className="total-row">
            <td colSpan={Object.keys(visibleColumns).length - 3}>
              Total
            </td>
            {visibleColumns.clicks && <td>{totals.totalClicks}</td>}
            {visibleColumns.conversions && <td>{totals.totalConversions}</td>}
            {visibleColumns.revenue && (
              <td>${totals.totalRevenue.toFixed(2)}</td>
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default AdminDashboard;
