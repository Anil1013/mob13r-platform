import React, { useState, useEffect } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";

const AdminDashboard = () => {
  const [reports, setReports] = useState([]);
  const [partners, setPartners] = useState(["SEL Telecom", "Mob13r", "Tapflow"]);
  const [affiliates, setAffiliates] = useState(["Affiliate 1", "Affiliate 2", "Affiliate 3"]);
  const [offers, setOffers] = useState(["Offer A", "Offer B", "Offer C"]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    partner: "All Partners",
    affiliate: "All Affiliates",
    offer: "All Offers",
  });
  const [hourlyView, setHourlyView] = useState(false);

  // ✅ Fetch report data
  const fetchReports = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/reports`);
      setReports(response.data);
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
  };

  // ✅ Auto-refresh every 10 minutes
  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 10 * 60 * 1000);
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
    saveAs(blob, "reports.csv");
  };

  // ✅ Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Reports Summary", 14, 16);
    autoTable(doc, {
      startY: 20,
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
    doc.save("reports.pdf");
  };

  return (
    <div className="min-h-screen bg-[#0b1221] text-gray-100 p-6">
      <h1 className="text-3xl font-bold text-cyan-400 mb-6 text-center">
        Mob13r Admin Dashboard
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

          <select
            className="bg-[#0e1624] text-gray-200 px-3 py-2 rounded-lg border border-gray-600"
            onChange={(e) => setFilters({ ...filters, partner: e.target.value })}
          >
            <option>All Partners</option>
            {partners.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>

          <select
            className="bg-[#0e1624] text-gray-200 px-3 py-2 rounded-lg border border-gray-600"
            onChange={(e) => setFilters({ ...filters, affiliate: e.target.value })}
          >
            <option>All Affiliates</option>
            {affiliates.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>

          <select
            className="bg-[#0e1624] text-gray-200 px-3 py-2 rounded-lg border border-gray-600"
            onChange={(e) => setFilters({ ...filters, offer: e.target.value })}
          >
            <option>All Offers</option>
            {offers.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>

          <label className="text-gray-300 flex items-center gap-2">
            <input
              type="checkbox"
              checked={hourlyView}
              onChange={() => setHourlyView(!hourlyView)}
            />
            Hourly View
          </label>

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
          Reports
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
                  <td className="p-3 text-cyan-400 font-semibold">
                    {r.conversions}
                  </td>
                  <td className="p-3">${r.revenue}</td>
                  <td className="p-3">${r.payout}</td>
                  <td className="p-3 text-cyan-400 font-semibold">
                    ${r.profit}
                  </td>
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
