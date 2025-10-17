import React, { useState, useEffect } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

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
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ Fetch all API data
  const fetchData = async (showLoader = true, resetFilters = false) => {
    try {
      if (showLoader) setLoading(true);

      const [r, p, a, o] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/admin/reports`),
        axios.get(`${process.env.REACT_APP_API_URL}/admin/partners`),
        axios.get(`${process.env.REACT_APP_API_URL}/admin/affiliates`),
        axios.get(`${process.env.REACT_APP_API_URL}/admin/offers`),
      ]);

      setReports(r.data);
      setPartners(p.data);
      setAffiliates(a.data);
      setOffers(o.data);

      if (resetFilters) {
        setFilters({
          startDate: "",
          endDate: "",
          partner: "All Partners",
          affiliate: "All Affiliates",
          offer: "All Offers",
        });
      }

      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);
    const interval = setInterval(fetchData, 10 * 60 * 1000); // auto refresh every 10 mins
    return () => clearInterval(interval);
  }, []);

  // ✅ Apply filters
  const filteredReports = reports.filter((r) => {
    const matchPartner = filters.partner === "All Partners" || r.partner === filters.partner;
    const matchAffiliate = filters.affiliate === "All Affiliates" || r.affiliate === filters.affiliate;
    const matchOffer = filters.offer === "All Offers" || r.offer === filters.offer;
    return matchPartner && matchAffiliate && matchOffer;
  });

  // ✅ Calculate totals
  const totals = filteredReports.reduce(
    (acc, r) => {
      acc.clicks += r.clicks || 0;
      acc.conversions += r.conversions || 0;
      acc.revenue += r.revenue || 0;
      acc.payout += r.payout || 0;
      acc.profit += r.profit || 0;
      return acc;
    },
    { clicks: 0, conversions: 0, revenue: 0, payout: 0, profit: 0 }
  );

  // ✅ Export handlers
  const exportCSV = () => {
    const headers = ["Date", "Partner", "Affiliate", "Offer", "Clicks", "Conversions", "Revenue", "Payout", "Profit"];
    const csvRows = [headers.join(","), ...filteredReports.map((r) =>
      [r.date, r.partner, r.affiliate, r.offer, r.clicks, r.conversions, `$${r.revenue}`, `$${r.payout}`, `$${r.profit}`].join(",")
    )];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "reports.csv");
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredReports);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reports");
    XLSX.writeFile(wb, "reports.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Mob13r Reports", 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [["Date", "Partner", "Affiliate", "Offer", "Clicks", "Conversions", "Revenue", "Payout", "Profit"]],
      body: filteredReports.map((r) => [
        r.date,
        r.partner,
        r.affiliate,
        r.offer,
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

  return (
    <div className="min-h-screen bg-[#0b1221] text-gray-100 p-6">
      <h1 className="text-3xl font-bold text-cyan-400 mb-6 text-center">
        📊 Mob13r Admin Dashboard
      </h1>

      {/* Filter Bar */}
      <div className="bg-[#121a2b] p-5 rounded-2xl shadow-lg mb-8">
        <div className="flex flex-wrap gap-4 justify-center items-center mb-6">
          <input
            type="date"
            className="bg-[#0e1624] text-gray-200 px-3 py-2 rounded-lg border border-gray-600"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          />
          <input
            type="date"
            className="bg-[#0e1624] text-gray-200 px-3 py-2 rounded-lg border border-gray-600"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          />

          {/* Partners */}
          <select
            className="bg-[#0e1624] text-gray-200 px-3 py-2 rounded-lg border border-gray-600"
            value={filters.partner}
            onChange={(e) => setFilters({ ...filters, partner: e.target.value })}
          >
            <option>All Partners</option>
            {partners.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name} {p.country ? `(${p.country})` : ""}
              </option>
            ))}
          </select>

          {/* Affiliates */}
          <select
            className="bg-[#0e1624] text-gray-200 px-3 py-2 rounded-lg border border-gray-600"
            value={filters.affiliate}
            onChange={(e) => setFilters({ ...filters, affiliate: e.target.value })}
          >
            <option>All Affiliates</option>
            {affiliates.map((a) => (
              <option key={a.id} value={a.name}>
                {a.name} {a.region ? `(${a.region})` : ""}
              </option>
            ))}
          </select>

          {/* Offers */}
          <select
            className="bg-[#0e1624] text-gray-200 px-3 py-2 rounded-lg border border-gray-600"
            value={filters.offer}
            onChange={(e) => setFilters({ ...filters, offer: e.target.value })}
          >
            <option>All Offers</option>
            {offers.map((o) => (
              <option key={o.id} value={o.name}>
                {o.name} {o.operator ? `(${o.operator})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Export Buttons */}
        <div className="flex justify-center gap-4 mb-3">
          <button onClick={exportCSV} className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg font-semibold">
            Export CSV
          </button>
          <button onClick={exportExcel} className="bg-yellow-600 hover:bg-yellow-500 px-4 py-2 rounded-lg font-semibold">
            Export Excel
          </button>
          <button onClick={exportPDF} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-semibold">
            Export PDF
          </button>
        </div>

        {/* Last Updated + Refresh */}
        <div className="flex justify-center items-center gap-4 text-gray-400 text-sm mt-3">
          <span>
            ⏱️ Last Updated: <span className="text-cyan-400">{lastUpdated || "Loading..."}</span>
          </span>
          <button
            onClick={() => fetchData(true, true)} // resets filters on refresh
            disabled={loading}
            className={`flex items-center gap-2 px-3 py-1 rounded-md text-white font-medium transition-all ${
              loading ? "bg-gray-600 cursor-not-allowed" : "bg-cyan-600 hover:bg-cyan-500"
            }`}
          >
            {loading && (
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
            )}
            {loading ? "Refreshing..." : "🔄 Refresh Now"}
          </button>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-[#121a2b] p-6 rounded-2xl shadow-xl overflow-x-auto">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4 text-center">Reports</h2>
        <table className="w-full border-collapse text-center">
          <thead>
            <tr className="border-b border-gray-700 text-cyan-300">
              <th className="p-3">Date</th>
              <th className="p-3">Partner</th>
              <th className="p-3">Affiliate</th>
              <th className="p-3">Offer</th>
              <th className="p-3">Clicks</th>
              <th className="p-3">Conversions</th>
              <th className="p-3">Revenue</th>
              <th className="p-3">Payout</th>
              <th className="p-3">Profit</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.length > 0 ? (
              <>
                {filteredReports.map((r, i) => (
                  <tr key={i} className="border-b border-gray-800 hover:bg-[#1a2337] transition-all duration-150">
                    <td className="p-3">{r.date}</td>
                    <td className="p-3">{r.partner}</td>
                    <td className="p-3">{r.affiliate}</td>
                    <td className="p-3">{r.offer}</td>
                    <td className="p-3">{r.clicks}</td>
                    <td className="p-3 text-cyan-400 font-semibold">{r.conversions}</td>
                    <td className="p-3">${r.revenue}</td>
                    <td className="p-3">${r.payout}</td>
                    <td className="p-3 text-cyan-400 font-semibold">${r.profit}</td>
                  </tr>
                ))}
                <tr className="bg-[#0f172a] font-semibold text-cyan-300 border-t-2 border-cyan-700">
                  <td colSpan="4" className="p-3 text-right">TOTAL:</td>
                  <td className="p-3">{totals.clicks}</td>
                  <td className="p-3">{totals.conversions}</td>
                  <td className="p-3">${totals.revenue.toFixed(2)}</td>
                  <td className="p-3">${totals.payout.toFixed(2)}</td>
                  <td className="p-3">${totals.profit.toFixed(2)}</td>
                </tr>
              </>
            ) : (
              <tr>
                <td colSpan="9" className="p-6 text-gray-400 text-center">No reports available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
