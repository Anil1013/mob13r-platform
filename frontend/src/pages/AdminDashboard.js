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

  const [timer, setTimer] = useState(600); // 10 minutes

  // Fetch reports
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

  // Auto-refresh countdown
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

  // Filters
  const applyFilters = () => {
    let filtered = reportData;
    if (filters.partner)
      filtered = filtered.filter((row) =>
        row.partner?.toLowerCase().includes(filters.partner.toLowerCase())
      );
    if (filters.affiliate)
      filtered = filtered.filter((row) =>
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

  // Totals calculation
  const totals = useMemo(() => {
    const tClicks = filteredData.reduce(
      (sum, r) => sum + (parseInt(r.clicks) || 0),
      0
    );
    const tPartnerConv = filteredData.reduce(
      (sum, r) => sum + (parseInt(r.partner_conversions) || 0),
      0
    );
    const tAffiliateConv = filteredData.reduce(
      (sum, r) => sum + (parseInt(r.affiliate_conversions) || 0),
      0
    );
    const tRevenue = filteredData.reduce(
      (sum, r) => sum + (parseFloat(r.revenue) || 0),
      0
    );
    const tCost = filteredData.reduce(
      (sum, r) => sum + (parseFloat(r.cost_to_affiliate) || 0),
      0
    );
    const tProfit = filteredData.reduce(
      (sum, r) => sum + (parseFloat(r.profit) || 0),
      0
    );

    return {
      clicks: tClicks,
      partnerConv: tPartnerConv,
      affiliateConv: tAffiliateConv,
      revenue: tRevenue,
      cost: tCost,
      profit: tProfit,
    };
  }, [filteredData]);

  // Export CSV/Excel
  const exportToCSV = () => {
    const headers = Object.keys(visibleColumns).filter((c) => visibleColumns[c]);
    const csv = [
      headers.join(","),
      ...filteredData.map((row) =>
        headers.map((col) => JSON.stringify(row[col] || "")).join(",")
      ),
    ].join("\n");
    saveAs(new Blob([csv], { type: "text/csv" }), "mob13r_report.csv");
  };

  const exportToExcel = () => {
    const visible = filteredData.map((row) => {
      const out = {};
      for (const key in visibleColumns)
        if (visibleColumns[key]) out[key] = row[key];
      return out;
    });
    const sheet = XLSX.utils.json_to_sheet(visible);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Report");
    XLSX.writeFile(book, "mob13r_report.xlsx");
  };

  return (
    <div className="admin-dashboard">
      {/* 🔹 Navbar Placeholder (you’ll customize next) */}
      <div className="top-navbar">
        <div className="nav-placeholder">
          🧭 Navbar Placeholder — will add Partner, Affiliate, Services menu here
        </div>
      </div>

      {/* 🔹 Header Row */}
      <div className="dashboard-header">
        <h2>📊 Mob13r Performance Dashboard</h2>
        <div className="auto-refresh">⏱️ Auto-refresh in {formatTime(timer)}</div>
      </div>

      {/* 🔹 Filters */}
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
          onChange={(e) =>
            setFilters({ ...filters, affiliate: e.target.value })
          }
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
          onChange={(e) =>
            setFilters({ ...filters, startDate: e.target.value })
          }
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
        />
        <button onClick={applyFilters}>Apply Filters</button>
        <button onClick={fetchData}>🔄 Refresh</button>
        <button onClick={exportToCSV}>📄 CSV</button>
        <button onClick={exportToExcel}>📘 Excel</button>
      </div>

      {/* 🔹 Data Table */}
      <table className="report-table">
        <thead>
          <tr>
            {Object.keys(visibleColumns).map(
              (k) =>
                visibleColumns[k] && (
                  <th key={k}>{k.replaceAll("_", " ").toUpperCase()}</th>
                )
            )}
          </tr>
        </thead>
        <tbody>
          {filteredData.map((row, i) => (
            <tr key={i}>
              {Object.keys(visibleColumns).map(
                (k) =>
                  visibleColumns[k] && (
                    <td
                      key={k}
                      style={
                        k === "profit"
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
                      {row[k]}
                    </td>
                  )
              )}
            </tr>
          ))}

          {/* 🔹 Total Row */}
          <tr className="total-row">
            <td colSpan={7}>Total</td>
            {visibleColumns.clicks && <td>{totals.clicks}</td>}
            {visibleColumns.partner_conversions && (
              <td>{totals.partnerConv}</td>
            )}
            {visibleColumns.affiliate_conversions && (
              <td>{totals.affiliateConv}</td>
            )}
            {visibleColumns.revenue && (
              <td>${totals.revenue.toFixed(2)}</td>
            )}
            {visibleColumns.cost_to_affiliate && (
              <td>${totals.cost.toFixed(2)}</td>
            )}
            {visibleColumns.profit && (
              <td
                style={{
                  color: totals.profit >= 0 ? "#00ff80" : "#ff4d4d",
                  fontWeight: "bold",
                }}
              >
                ${totals.profit.toFixed(2)}
              </td>
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default AdminDashboard;
