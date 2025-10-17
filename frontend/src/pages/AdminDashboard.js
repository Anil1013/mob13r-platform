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

  // 🔁 Fetch data
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

  // 🔁 Auto-refresh logic
  useEffect(() => {
    fetchData();

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          fetchData();
          return 600; // reset every 10 mins
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

  // 🔍 Apply filters
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

  // 📊 Totals
  const totals = useMemo(() => {
    const totalClicks = filteredData.reduce(
      (sum, row) => sum + (parseInt(row.clicks) || 0),
      0
    );
    const totalPartnerConv = filteredData.reduce(
      (sum, row) => sum + (parseInt(row.partner_conversions) || 0),
      0
    );
    const totalAffiliateConv = filteredData.reduce(
      (sum, row) => sum + (parseInt(row.affiliate_conversions) || 0),
      0
    );
    const totalRevenue = filteredData.reduce(
      (sum, row) => sum + (parseFloat(row.revenue) || 0),
      0
    );
    const totalCost = filteredData.reduce(
      (sum, row) => sum + (parseFloat(row.cost_to_affiliate) || 0),
      0
    );
    const totalProfit = filteredData.reduce(
      (sum, row) => sum + (parseFloat(row.profit) || 0),
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

  // 📄 Export CSV
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

  // 📘 Export Excel
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

  // 👁️ Toggle Columns
  const toggleColumn = (key) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div className="auto-refresh">
          ⏱️ Auto-refresh in {formatTime(timer)}
        </div>
        <h2>📊 Mob13r Performance Dashboard</h2>
      </div>

      <div className="filters">
        <select
          value={filters.partner}
          onChange={(e) => setFilters({ ...filters, partner: e.target.value })}
        >
          <option value="">All Partners</option>
          {[...new Set(reportData.map((r) => r.partner))].map((partner, i) => (
            <option key={i} value={partner}>
              {partner}
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
          {[...new Set(reportData.map((r) => r.affiliate))].map(
            (affiliate, i) => (
              <option key={i} value={affiliate}>
                {affiliate}
              </option>
            )
          )}
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

        <button onClick={exportToCSV}>📄 Export CSV</button>
        <button onClick={exportToExcel}>📘 Export Excel</button>
      </div>

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
                  visibleColumns[key] && <td key={key}>{row[key]}</td>
              )}
            </tr>
          ))}

          <tr className="total-row">
            <td colSpan={7}>Total</td>
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
            {visibleColumns.profit && <td>${totals.totalProfit.toFixed(2)}</td>}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default AdminDashboard;
