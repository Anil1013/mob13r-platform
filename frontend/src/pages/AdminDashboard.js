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
    const interval = setInterval(fetchData, 10 * 60 * 1000); // every 10 min
    return () => clearInterval(interval);
  }, []);

  // ✅ Filter logic
  const filteredReports = reports.filter((r) => {
    const matchPartner =
      filters.partner === "All Partners" || r.partner === filters.partner;
    const matchAffiliate =
      filters.affiliate === "All Affiliates" || r.affiliate === filters.affiliate;
    const matchOffer =
      filters.offer === "All Offers" || r.offer === filters.offer;

    const matchStartDate =
      !filters.startDate || new Date(r.date) >= new Date(filters.startDate);
    const matchEndDate =
      !filters.endDate || new Date(r.date) <= new Date(filters.endDate);

    return matchPartner && matchAffiliate && matchOffer && matchStartDate && matchEndDate;
  });

  // ✅ Calculate totals
  const totals = filteredReports.reduce(
    (acc, r) => {
      acc.clicks += r.clicks || 0;
      acc.partnerConversions += r.partner_conversions || 0;
      acc.affiliateConversions += r.affiliate_conversions || 0;
      acc.revenue += r.revenue || 0;
      acc.cost += r.cost_to_affiliate || 0;
      acc.profit += r.profit || 0;
      return acc;
    },
    { clicks: 0, partnerConversions: 0, affiliateConversions: 0, revenue: 0, cost: 0, profit: 0 }
  );

  // ✅ Export CSV
  const exportCSV = () => {
    const headers = [
      "Date",
      "Partner Service ID",
      "Publisher Campaign ID",
      "Partner",
      "Affiliate",
      "Geo",
      "Carrier",
      "Partner Service Name",
      "Clicks",
      "Partner Conversions",
      "Affiliate Conversions",
      "Revenue($)",
      "Cost to Affiliate($)",
      "Profit($)",
    ];

    const csvRows = [headers.join(","), ...filteredReports.map((r) =>
      [
        r.date,
        r.partner_service_id,
        r.publisher_campaign_id,
        r.partner,
        r.affiliate,
        r.geo,
        r.carrier,
        r.partner_service_name,
        r.clicks,
        r.partner_conversions,
        r.affiliate_conversions,
        r.revenue,
        r.cost_to_affiliate,
        r.profit,
      ].join(",")
    )];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "Mob13r_Reports.csv");
  };

  // ✅ Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Mob13r Full Reports", 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [
        [
          "Date",
          "Partner Service ID",
          "Publisher Campaign ID",
          "Partner",
          "Affiliate",
          "Geo",
          "Carrier",
          "Service Name",
          "Clicks",
          "P. Conv",
          "A. Conv",
          "Revenue($)",
          "Cost($)",
          "Profit($)",
        ],
      ],
      body: filteredReports.map((r) => [
        r.date,
        r.partner_service_id,
        r.publisher_campaign_id,
        r.partner,
        r.affiliate,
        r.geo,
        r.carrier,
        r.partner_service_name,
        r.clicks,
        r.partner_conversions,
        r.affiliate_conversions,
        r.revenue,
        r.cost_to_affiliate,
        r.profit,
      ]),
      styles: { fontSize: 8, halign: "center" },
    });
    doc.save("Mob13r_Reports.pdf");
  };

  return (
    <div className="min-h-screen bg-[#0b1221] text-gray-100 p-6">
      <h1 className="text-3xl font-bold text-cyan-400 mb-6 text-center">
        📊 Mob13r Admin Dashboard
      </h1>

      {/* 🔹 Filters */}
      <div className="bg-[#121a2b] p-5 rounded-2xl shadow-lg mb-8">
        <div className="flex flex-wrap gap-4 justify-center items-center mb-5">
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

          {/* Partner */}
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

          {/* Affiliate */}
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

          {/* Offer */}
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

          <button
            onClick={() => fetchData(true, true)}
            className="bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded-lg text-white font-semibold"
          >
            Apply / Refresh
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

      {/* 🔹 Reports Table */}
      <div className="bg-[#121a2b] p-6 rounded-2xl shadow-xl overflow-x-auto">
        <table className="w-full border-collapse text-center text-sm">
          <thead>
            <tr className="bg-[#1a2135] text-cyan-300 border-b border-cyan-700">
              <th>Date</th>
              <th>Partner service Id</th>
              <th>Publisher campaign ID</th>
              <th>Partner</th>
              <th>Affiliate</th>
              <th>Geo</th>
              <th>Carrier</th>
              <th>Partner’s service name</th>
              <th>Clicks</th>
              <th>Partner conversions</th>
              <th>Affiliate conversions</th>
              <th>Revenue($)</th>
              <th>Cost to affiliate($)</th>
              <th>Profit($)</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.length > 0 ? (
              <>
                {filteredReports.map((r, i) => (
                  <tr key={i} className="border-b border-gray-800 hover:bg-[#1a2337]">
                    <td>{r.date}</td>
                    <td>{r.partner_service_id}</td>
                    <td>{r.publisher_campaign_id}</td>
                    <td>{r.partner}</td>
                    <td>{r.affiliate}</td>
                    <td>{r.geo}</td>
                    <td>{r.carrier}</td>
                    <td>{r.partner_service_name}</td>
                    <td>{r.clicks}</td>
                    <td>{r.partner_conversions}</td>
                    <td>{r.affiliate_conversions}</td>
                    <td>${r.revenue}</td>
                    <td>${r.cost_to_affiliate}</td>
                    <td>${r.profit}</td>
                  </tr>
                ))}
                <tr className="bg-green-700 text-white font-semibold">
                  <td colSpan="8">Total</td>
                  <td>{totals.clicks}</td>
                  <td>{totals.partnerConversions}</td>
                  <td>{totals.affiliateConversions}</td>
                  <td>${totals.revenue.toFixed(1)}</td>
                  <td>${totals.cost.toFixed(1)}</td>
                  <td>${totals.profit.toFixed(1)}</td>
                </tr>
              </>
            ) : (
              <tr>
                <td colSpan="14" className="text-gray-400 py-6">
                  No report data found.
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
