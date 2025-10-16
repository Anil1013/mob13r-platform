import React, { useState, useEffect } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";

const AdminDashboard = () => {
  const [reports, setReports] = useState([]);
  const [partners, setPartners] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [offers, setOffers] = useState([]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    partner: "All Partners",
    affiliate: "All Affiliates",
    offer: "All Offers",
  });

  const API_BASE = process.env.REACT_APP_API_URL;

  // ✅ Fetch reports
  const fetchReports = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/reports`);
      setReports(res.data);
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
  };

  // ✅ Fetch dropdown data
  const fetchDropdownData = async () => {
    try {
      const [partnersRes, affiliatesRes, offersRes] = await Promise.all([
        axios.get(`${API_BASE}/api/admin/partners`),
        axios.get(`${API_BASE}/api/admin/affiliates`),
        axios.get(`${API_BASE}/api/admin/offers`),
      ]);
      setPartners(partnersRes.data.map((p) => p.name || p.partner_name));
      setAffiliates(affiliatesRes.data.map((a) => a.name || a.affiliate_name));
      setOffers(offersRes.data.map((o) => o.name || o.offer_name));
    } catch (error) {
      console.error("Error fetching dropdown data:", error);
    }
  };

  // ✅ Initial + auto refresh every 10 min
  useEffect(() => {
    fetchReports();
    fetchDropdownData();
    const interval = setInterval(fetchReports, process.env.REACT_APP_REFRESH_INTERVAL || 600000);
    return () => clearInterval(interval);
  }, []);

  // ✅ Export CSV
  const exportCSV = () => {
    const headers = ["Date", "Partner", "Clicks", "Conversions", "Revenue", "Payout", "Profit"];
    const csvRows = [
      headers.join(","),
      ...reports.map((r) =>
        [r.date, r.partner, r.clicks, r.conversions, `$${r.revenue}`, `$${r.payout}`, `$${r.profit}`].join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "Mob13r_Reports.csv");
  };

  // ✅ Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Mob13r Reports Summary", 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [["Date", "Partner", "Clicks", "Conversions", "Revenue", "Payout", "Profit"]],
      body: reports.map((r) => [
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
    doc.save("Mob13r_Reports.pdf");
  };

  return (
    <div className="min-h-screen bg-[#0b1221] text-gray-100 p-6">
      <h1 className="text-3xl font-bold text-cyan-400 mb-8 text-center">
        📊 Mob13r Admin Dashboard
      </h1>

      {/* ================= Filters Section ================= */}
      <div className="bg-[#121a2b] p-5 rounded-2xl shadow-lg mb-8">
        <div className="flex flex-wrap gap-4 justify-center items-center mb-6">
          <input
            type="date"
            className="bg-[#0e1624] text-gray-200 px-3 py-2 rounded-lg border border-gray-600"
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          />
          <input
            type="date"
            className="bg-[#0e1624] text-gray-200 px-3 py-2 rounded-lg border border-gray-600"
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          />

          {/* Partner Dropdown */}
          <select
            className="bg-[#0e1624] text-gray-200 px-3 py-2 rounded-lg border border-gray-600"
            onChange={(e) => setFilters({ ...filters, partner: e.target.value })}
          >
            <option>All Partners</option>
            {partners.map((p, i) => (
              <option key={i}>{p}</option>
            ))}
          </select>

          {/* Affiliate Dropdown */}
          <select
            className="bg-[#0e1624] text-gray-200 px-3 py-2 rounded-lg border border-gray-600"
            onChange={(e) => setFilters({ ...filters, affiliate: e.target.value })}
          >
            <option>All Affiliates</option>
            {affiliates.map((a, i) => (
              <option key={i}>{a}</option>
            ))}
          </select>

          {/* Offer Dropdown */}
          <select
            className="bg-[#0e1624] text-gray-200 px-3 py-2 rounded-lg border border-gray-600"
            onChange={(e) => setFilters({ ...filters, offer: e.target.value })}
          >
            <option>All Offers</option>
            {offers.map((o, i) => (
              <option key={i}>{o}</option>
            ))}
          </select>

          <button
            onClick={fetchReports}
            className="bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded-lg font-semibold text-white"
          >
            Load
          </button>
        </div>

        {/* Export Buttons */}
        <div className="flex justify-center gap-4">
          <button
            onClick={exportCSV}
            className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg font-semibold"
          >
            Export CSV
          </button>
          <button
            onClick={exportPDF}
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-semibold"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* ================= Reports Table ================= */}
      <div className="bg-[#121a2b] p-6 rounded-2xl shadow-xl overflow-x-auto">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4 text-center">
          Reports Summary
        </h2>
        <table className="w-full border-collapse text-center">
          <thead>
            <tr className="border-b border-gray-700 text-cyan-300">
              <th className="p-3">Date</th>
              <th className="p-3">Partner</th>
              <th className="p-3">Clicks</th>
              <th className="p-3">Conversions</th>
              <th className="p-3">Revenue</th>
              <th className="p-3">Payout</th>
              <th className="p-3">Profit</th>
            </tr>
          </thead>
          <tbody>
            {reports.length > 0 ? (
              reports.map((r, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-800 hover:bg-[#1a2337] transition-all duration-150"
                >
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
      </div>
    </div>
  );
};

export default AdminDashboard;
