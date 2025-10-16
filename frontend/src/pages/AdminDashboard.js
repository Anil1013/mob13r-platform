import React, { useState, useEffect } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
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
  const [refreshTimer, setRefreshTimer] = useState(600); // 10 minutes countdown

  // ✅ Fetch data from backend
  const fetchData = async () => {
    try {
      const base = process.env.REACT_APP_API_URL;
      const [r, p, a, o] = await Promise.all([
        axios.get(`${base}/admin/reports`),
        axios.get(`${base}/admin/partners`),
        axios.get(`${base}/admin/affiliates`),
        axios.get(`${base}/admin/offers`),
      ]);
      setReports(r.data);
      setPartners(p.data);
      setAffiliates(a.data);
      setOffers(o.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  // ✅ Auto refresh timer logic
  useEffect(() => {
    fetchData();
    const refreshInterval = setInterval(fetchData, 10 * 60 * 1000);
    const timerInterval = setInterval(() => {
      setRefreshTimer((prev) => (prev > 0 ? prev - 1 : 600));
    }, 1000);
    return () => {
      clearInterval(refreshInterval);
      clearInterval(timerInterval);
    };
  }, []);

  // ✅ Apply filters
  const filteredReports = reports.filter((r) => {
    const matchPartner =
      filters.partner === "All Partners" || r.partner === filters.partner;
    const matchAffiliate =
      filters.affiliate === "All Affiliates" || r.affiliate === filters.affiliate;
    const matchOffer =
      filters.offer === "All Offers" ||
      r.publisherCampaignId.toString().includes(filters.offer);
    return matchPartner && matchAffiliate && matchOffer;
  });

  // ✅ Export CSV
  const exportCSV = () => {
    const headers = [
      "Date",
      "Partner Serv ID",
      "Publisher Campaign ID",
      "Partner",
      "Affiliate",
      "Geo",
      "Carrier",
      "Clicks",
      "Partner Conversions",
      "Affiliate Conversions",
      "Revenue($)",
      "Cost to Affiliate($)",
      "Profit($)",
    ];
    const csvRows = [
      headers.join(","),
      ...filteredReports.map((r) =>
        [
          r.date,
          r.partnerServId,
          r.publisherCampaignId,
          r.partner,
          r.affiliate,
          r.geo,
          r.carrier,
          r.clicks,
          r.partnerConversions,
          r.affiliateConversions,
          r.revenue,
          r.costToAffiliate,
          r.profit,
        ].join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "reports.csv");
  };

  // ✅ Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Mob13r Reports", 14, 16);
    autoTable(doc, {
      startY: 20,
      head: [
        [
          "Date",
          "Partner Serv ID",
          "Publisher Campaign ID",
          "Partner",
          "Affiliate",
          "Geo",
          "Carrier",
          "Clicks",
          "Partner Conv.",
          "Affiliate Conv.",
          "Revenue($)",
          "Cost($)",
          "Profit($)",
        ],
      ],
      body: filteredReports.map((r) => [
        r.date,
        r.partnerServId,
        r.publisherCampaignId,
        r.partner,
        r.affiliate,
        r.geo,
        r.carrier,
        r.clicks,
        r.partnerConversions,
        r.affiliateConversions,
        r.revenue,
        r.costToAffiliate,
        r.profit,
      ]),
      styles: { halign: "center" },
    });
    doc.save("reports.pdf");
  };

  // ✅ Export Excel
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredReports);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reports");
    XLSX.writeFile(wb, "reports.xlsx");
  };

  return (
    <div className="min-h-screen bg-[#0b1221] text-gray-100 p-6">
      <h1 className="text-3xl font-bold text-cyan-400 mb-6 text-center">
        ⚙️ Mob13r Admin Dashboard
      </h1>

      {/* Filters */}
      <div className="bg-[#121a2b] p-5 rounded-2xl shadow-lg mb-6">
        <div className="flex flex-wrap justify-center gap-3 mb-4">
          <span className="text-blue-400 font-semibold">
            🔁 Auto-refresh in {Math.floor(refreshTimer / 60)}:
            {String(refreshTimer % 60).padStart(2, "0")}
          </span>
        </div>

        <div className="flex flex-wrap gap-3 justify-center mb-4">
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
              <option key={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            className="bg-[#0e1624] text-gray-200 px-3 py-2 rounded-lg border border-gray-600"
            onChange={(e) => setFilters({ ...filters, affiliate: e.target.value })}
          >
            <option>All Affiliates</option>
            {affiliates.map((a) => (
              <option key={a.id}>{a.name}</option>
            ))}
          </select>
          <select
            className="bg-[#0e1624] text-gray-200 px-3 py-2 rounded-lg border border-gray-600"
            onChange={(e) => setFilters({ ...filters, offer: e.target.value })}
          >
            <option>All Offers</option>
            {offers.map((o) => (
              <option key={o.id}>{o.name}</option>
            ))}
          </select>
          <button
            onClick={fetchData}
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-semibold"
          >
            Apply
          </button>
        </div>

        <div className="flex justify-center gap-3">
          <button onClick={exportCSV} className="bg-green-600 px-4 py-2 rounded-lg">
            Export CSV
          </button>
          <button onClick={exportPDF} className="bg-red-600 px-4 py-2 rounded-lg">
            Export PDF
          </button>
          <button onClick={exportExcel} className="bg-yellow-500 px-4 py-2 rounded-lg text-black">
            Export Excel
          </button>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-[#121a2b] p-6 rounded-2xl shadow-xl overflow-x-auto">
        <table className="w-full border-collapse text-center">
          <thead>
            <tr className="border-b border-gray-700 text-cyan-300">
              <th className="p-3">Date</th>
              <th className="p-3">Partner Serv ID</th>
              <th className="p-3">Publisher Campaign ID</th>
              <th className="p-3">Partner</th>
              <th className="p-3">Affiliate</th>
              <th className="p-3">Geo</th>
              <th className="p-3">Carrier</th>
              <th className="p-3">Clicks</th>
              <th className="p-3">Partner Conv.</th>
              <th className="p-3">Affiliate Conv.</th>
              <th className="p-3">Revenue($)</th>
              <th className="p-3">Cost($)</th>
              <th className="p-3">Profit($)</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.map((r, i) => (
              <tr
                key={i}
                className="border-b border-gray-800 hover:bg-[#1a2337] transition-all"
              >
                <td className="p-3">{r.date}</td>
                <td className="p-3">{r.partnerServId}</td>
                <td className="p-3">{r.publisherCampaignId}</td>
                <td className="p-3">{r.partner}</td>
                <td className="p-3">{r.affiliate}</td>
                <td className="p-3">{r.geo}</td>
                <td className="p-3">{r.carrier}</td>
                <td className="p-3">{r.clicks}</td>
                <td className="p-3">{r.partnerConversions}</td>
                <td className="p-3">{r.affiliateConversions}</td>
                <td className="p-3">${r.revenue}</td>
                <td className="p-3">${r.costToAffiliate}</td>
                <td className="p-3 text-cyan-400 font-semibold">${r.profit}</td>
              </tr>
            ))}

            {/* ✅ Total Row */}
            <tr className="bg-green-700 text-white font-bold">
              <td colSpan="7" className="p-3 text-right">Total</td>
              <td className="p-3">{filteredReports.reduce((s, r) => s + r.clicks, 0)}</td>
              <td className="p-3">{filteredReports.reduce((s, r) => s + r.partnerConversions, 0)}</td>
              <td className="p-3">{filteredReports.reduce((s, r) => s + r.affiliateConversions, 0)}</td>
              <td className="p-3">${filteredReports.reduce((s, r) => s + r.revenue, 0).toFixed(1)}</td>
              <td className="p-3">${filteredReports.reduce((s, r) => s + r.costToAffiliate, 0).toFixed(1)}</td>
              <td className="p-3">${filteredReports.reduce((s, r) => s + r.profit, 0).toFixed(1)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
