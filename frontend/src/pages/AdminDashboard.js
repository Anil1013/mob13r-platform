import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";

const AdminDashboard = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    partner: "All Partners",
    affiliate: "All Affiliates",
    offer: "All Offers",
  });
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [countdown, setCountdown] = useState(600); // 10 min = 600 seconds
  const itemsPerPage = 10;
  const API_URL = process.env.REACT_APP_API_URL;
  const timerRef = useRef(null);

  // ✅ Fetch Reports
  const fetchReports = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/reports`);
      setReports(response.data);
      setFilteredReports(response.data);
      setCountdown(600); // reset countdown
    } catch (err) {
      console.error("Error fetching reports:", err);
    }
  };

  useEffect(() => {
    fetchReports();
    timerRef.current = setInterval(fetchReports, 10 * 60 * 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // ✅ Countdown Timer
  useEffect(() => {
    const countdownTimer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(countdownTimer);
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ✅ Filters
  const applyFilters = () => {
    let data = [...reports];
    if (filters.startDate)
      data = data.filter((r) => new Date(r.date) >= new Date(filters.startDate));
    if (filters.endDate)
      data = data.filter((r) => new Date(r.date) <= new Date(filters.endDate));
    if (filters.partner !== "All Partners")
      data = data.filter((r) => r.partner === filters.partner);
    if (filters.affiliate !== "All Affiliates")
      data = data.filter((r) => r.affiliate === filters.affiliate);
    if (filters.offer !== "All Offers")
      data = data.filter((r) => r.offer === filters.offer);

    setFilteredReports(data);
    setCurrentPage(1);
  };

  // ✅ Sorting
  const sortData = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    const sorted = [...filteredReports].sort((a, b) => {
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
      return 0;
    });
    setFilteredReports(sorted);
    setSortConfig({ key, direction });
  };

  // ✅ Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedReports = filteredReports.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  // ✅ Export CSV
  const exportCSV = () => {
    const headers = ["Date", "Partner", "Clicks", "Conversions", "Revenue", "Payout", "Profit"];
    const csvRows = [
      headers.join(","),
      ...filteredReports.map((r) =>
        [r.date, r.partner, r.clicks, r.conversions, `$${r.revenue}`, `$${r.payout}`, `$${r.profit}`].join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "reports.csv");
  };

  // ✅ Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Mob13r Reports Summary", 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [["Date", "Partner", "Clicks", "Conversions", "Revenue", "Payout", "Profit"]],
      body: filteredReports.map((r) => [
        r.date,
        r.partner,
        r.clicks,
        r.conversions,
        `$${r.revenue}`,
        `$${r.payout}`,
        `$${r.profit}`,
      ]),
      styles: { halign: "center" },
    });
    doc.save("reports.pdf");
  };

  // ✅ Stats
  const totalClicks = filteredReports.reduce((sum, r) => sum + r.clicks, 0);
  const totalConversions = filteredReports.reduce((sum, r) => sum + r.conversions, 0);
  const totalRevenue = filteredReports.reduce((sum, r) => sum + r.revenue, 0);
  const totalProfit = filteredReports.reduce((sum, r) => sum + r.profit, 0);

  return (
    <div className="min-h-screen bg-[#0b1221] text-gray-100 p-6">
      <h1 className="text-3xl font-bold text-cyan-400 mb-2 text-center">
        ⚙️ Mob13r Admin Dashboard
      </h1>

      {/* ✅ Live Refresh Countdown */}
      <p className="text-center text-sm text-gray-400 mb-6">
        🔄 Auto-refresh in <span className="text-cyan-400 font-semibold">{formatTime(countdown)}</span>
      </p>

      {/* ================= Filters Section ================= */}
      <div className="bg-[#121a2b] p-5 rounded-2xl shadow-lg mb-8">
        <div className="flex flex-wrap gap-4 justify-center items-center mb-6">
          <input type="date" className="bg-[#0e1624] text-gray-200 px-3 py-2 rounded-lg border border-gray-600"
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
          <input type="date" className="bg-[#0e1624] text-gray-200 px-3 py-2 rounded-lg border border-gray-600"
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
          <select className="bg-[#0e1624] text-gray-200 px-3 py-2 rounded-lg border border-gray-600"
            onChange={(e) => setFilters({ ...filters, partner: e.target.value })}>
            <option>All Partners</option>
            <option>Partner 1</option>
            <option>Partner 2</option>
            <option>Partner 3</option>
          </select>
          <select className="bg-[#0e1624] text-gray-200 px-3 py-2 rounded-lg border border-gray-600"
            onChange={(e) => setFilters({ ...filters, affiliate: e.target.value })}>
            <option>All Affiliates</option>
            <option>Affiliate 1</option>
            <option>Affiliate 2</option>
          </select>
          <select className="bg-[#0e1624] text-gray-200 px-3 py-2 rounded-lg border border-gray-600"
            onChange={(e) => setFilters({ ...filters, offer: e.target.value })}>
            <option>All Offers</option>
            <option>Offer A</option>
            <option>Offer B</option>
          </select>
          <button onClick={applyFilters}
            className="bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded-lg font-semibold text-white">
            Apply
          </button>
        </div>

        <div className="flex justify-center gap-4">
          <button onClick={exportCSV}
            className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg font-semibold">
            Export CSV
          </button>
          <button onClick={exportPDF}
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-semibold">
            Export PDF
          </button>
        </div>
      </div>

      {/* ================= Summary Stats ================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 text-center">
        <div className="bg-[#121a2b] p-6 rounded-2xl shadow-lg">
          <h3 className="text-cyan-400 text-lg font-semibold">Total Clicks</h3>
          <p className="text-3xl font-bold mt-2">{totalClicks}</p>
        </div>
        <div className="bg-[#121a2b] p-6 rounded-2xl shadow-lg">
          <h3 className="text-cyan-400 text-lg font-semibold">Conversions</h3>
          <p className="text-3xl font-bold mt-2">{totalConversions}</p>
        </div>
        <div className="bg-[#121a2b] p-6 rounded-2xl shadow-lg">
          <h3 className="text-cyan-400 text-lg font-semibold">Revenue ($)</h3>
          <p className="text-3xl font-bold mt-2">${totalRevenue}</p>
        </div>
        <div className="bg-[#121a2b] p-6 rounded-2xl shadow-lg">
          <h3 className="text-cyan-400 text-lg font-semibold">Profit ($)</h3>
          <p className="text-3xl font-bold mt-2">${totalProfit}</p>
        </div>
      </div>

      {/* ================= Reports Table ================= */}
      <div className="bg-[#121a2b] p-6 rounded-2xl shadow-xl overflow-x-auto">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4 text-center">Reports Data</h2>
        <table className="w-full border-collapse text-center">
          <thead>
            <tr className="border-b border-gray-700 text-cyan-300">
              {["date", "partner", "clicks", "conversions", "revenue", "payout", "profit"].map((key) => (
                <th key={key} className="p-3 cursor-pointer hover:text-white" onClick={() => sortData(key)}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}{" "}
                  {sortConfig.key === key ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedReports.length > 0 ? (
              paginatedReports.map((r, i) => (
                <tr key={i} className="border-b border-gray-800 hover:bg-[#1a2337] transition-all">
                  <td className="p-3">{r.date}</td>
                  <td className="p-3">{r.partner}</td>
                  <td className="p-3">{r.clicks}</td>
                  <td className="p-3 text-cyan-400 font-semibold">{r.conversions}</td>
                  <td className="p-3">${r.revenue}</td>
                  <td className="p-3">${r.payout}</td>
                  <td className="p-3 text-cyan-400 font-semibold">${r.profit}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="p-6 text-gray-400 text-center">
                  No reports available.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex justify-center items-center gap-4 mt-6">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
