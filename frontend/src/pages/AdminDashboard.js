import React, { useState, useEffect } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "../styles/AdminDashboard.css"; // keep your table styling here

const API_URL = process.env.REACT_APP_API_URL || "https://backend.mob13r.com/api";

export default function AdminDashboard() {
  const [reports, setReports] = useState([]);
  const [partners, setPartners] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [offers, setOffers] = useState([]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    partner: "All",
    affiliate: "All",
    offer: "All",
  });

  // ✅ Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  // 🔹 Normalize keys to prevent blank cells
  const normalizeData = (data) =>
    data.map((item) => ({
      date: item.date || "—",
      partnerServiceId: item.partnerServiceId || item.partner_service_id || "—",
      publisherCampaignId: item.publisherCampaignId || item.publisher_campaign_id || "—",
      partner: item.partner || "—",
      affiliate: item.affiliate || "—",
      geo: item.geo || "—",
      carrier: item.carrier || "—",
      serviceName: item.serviceName || item.service_name || "—",
      clicks: item.clicks ?? 0,
      partnerConversions:
        item.partnerConversions ?? item.partner_conversions ?? 0,
      affiliateConversions:
        item.affiliateConversions ?? item.affiliate_conversions ?? 0,
      revenue: item.revenue ?? 0,
      cost: item.cost ?? item.cost_to_affiliate ?? 0,
      profit: item.profit ?? 0,
    }));

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/reports`);
      setReports(normalizeData(res.data || []));
    } catch (err) {
      console.error("Error fetching reports:", err);
    }
  };

  // 📅 Handle filter change
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // ⚙️ Apply filters
  const filteredReports = reports.filter((r) => {
    const matchPartner =
      filters.partner === "All" || r.partner === filters.partner;
    const matchAffiliate =
      filters.affiliate === "All" || r.affiliate === filters.affiliate;
    const matchOffer = filters.offer === "All" || r.serviceName === filters.offer;
    return matchPartner && matchAffiliate && matchOffer;
  });

  // 📊 Totals row
  const totals = filteredReports.reduce(
    (acc, curr) => {
      acc.clicks += Number(curr.clicks) || 0;
      acc.partnerConversions += Number(curr.partnerConversions) || 0;
      acc.affiliateConversions += Number(curr.affiliateConversions) || 0;
      acc.revenue += Number(curr.revenue) || 0;
      acc.cost += Number(curr.cost) || 0;
      acc.profit += Number(curr.profit) || 0;
      return acc;
    },
    {
      clicks: 0,
      partnerConversions: 0,
      affiliateConversions: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
    }
  );

  // 📤 Export to Excel
  const exportExcel = () => {
    const filename = `Mob13r_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
    const ws = XLSX.utils.json_to_sheet(filteredReports);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reports");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([excelBuffer]), filename);
  };

  // 📄 Export to PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Mob13r Admin Report", 14, 12);
    autoTable(doc, {
      startY: 18,
      head: [
        [
          "Date",
          "Partner service Id",
          "Publisher campaign ID",
          "Partner",
          "Affiliate",
          "Geo",
          "Carrier",
          "Partner’s service name",
          "Clicks",
          "Partner conversions",
          "Affiliate conversions",
          "Revenue($)",
          "Cost to affiliate($)",
          "Profit($)",
        ],
      ],
      body: filteredReports.map((r) => [
        r.date,
        r.partnerServiceId,
        r.publisherCampaignId,
        r.partner,
        r.affiliate,
        r.geo,
        r.carrier,
        r.serviceName,
        r.clicks,
        r.partnerConversions,
        r.affiliateConversions,
        `$${r.revenue.toFixed(2)}`,
        `$${r.cost.toFixed(2)}`,
        `$${r.profit.toFixed(2)}`,
      ]),
    });
    doc.save(`Mob13r_Report_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <div className="admin-dashboard">
      <h2>Mob13r Admin Dashboard</h2>
      <div className="filters">
        <input
          type="date"
          name="startDate"
          value={filters.startDate}
          onChange={handleFilterChange}
        />
        <input
          type="date"
          name="endDate"
          value={filters.endDate}
          onChange={handleFilterChange}
        />
        <select name="partner" onChange={handleFilterChange}>
          <option>All Partners</option>
          {partners.map((p, i) => (
            <option key={i}>{p}</option>
          ))}
        </select>
        <select name="affiliate" onChange={handleFilterChange}>
          <option>All Affiliates</option>
          {affiliates.map((a, i) => (
            <option key={i}>{a}</option>
          ))}
        </select>
        <select name="offer" onChange={handleFilterChange}>
          <option>All Offers</option>
          {offers.map((o, i) => (
            <option key={i}>{o}</option>
          ))}
        </select>
        <button onClick={fetchData}>Apply / Refresh</button>
        <button onClick={exportExcel}>Export CSV</button>
        <button onClick={exportPDF}>Export PDF</button>
      </div>

      <table className="report-table">
        <thead>
          <tr>
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
          {filteredReports.map((r, i) => (
            <tr key={i}>
              <td>{r.date}</td>
              <td>{r.partnerServiceId}</td>
              <td>{r.publisherCampaignId}</td>
              <td>{r.partner}</td>
              <td>{r.affiliate}</td>
              <td>{r.geo}</td>
              <td>{r.carrier}</td>
              <td>{r.serviceName}</td>
              <td>{r.clicks}</td>
              <td>{r.partnerConversions}</td>
              <td>{r.affiliateConversions}</td>
              <td>${r.revenue?.toFixed(2) || "—"}</td>
              <td>${r.cost?.toFixed(2) || "—"}</td>
              <td>${r.profit?.toFixed(2) || "—"}</td>
            </tr>
          ))}
          <tr className="total-row">
            <td colSpan="8">Total</td>
            <td>{totals.clicks}</td>
            <td>{totals.partnerConversions}</td>
            <td>{totals.affiliateConversions}</td>
            <td>${totals.revenue.toFixed(1)}</td>
            <td>${totals.cost.toFixed(1)}</td>
            <td>${totals.profit.toFixed(1)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
