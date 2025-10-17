import React, { useState, useEffect } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "../styles/AdminDashboard.css";

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

  // Column visibility control
  const [visibleCols, setVisibleCols] = useState(() => {
    const saved = localStorage.getItem("visibleCols");
    return (
      JSON.parse(saved) || {
        partnerServiceId: true,
        publisherCampaignId: true,
        partner: true,
        affiliate: true,
        geo: true,
        carrier: true,
        serviceName: true,
        clicks: true,
        partnerConversions: true,
        affiliateConversions: true,
        revenue: true,
        cost: true,
        profit: true,
      }
    );
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    localStorage.setItem("visibleCols", JSON.stringify(visibleCols));
  }, [visibleCols]);

  const toggleColumn = (col) =>
    setVisibleCols((prev) => ({ ...prev, [col]: !prev[col] }));

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
      partnerConversions: item.partnerConversions ?? item.partner_conversions ?? 0,
      affiliateConversions: item.affiliateConversions ?? item.affiliate_conversions ?? 0,
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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const filteredReports = reports.filter((r) => {
    const matchPartner =
      filters.partner === "All" || r.partner === filters.partner;
    const matchAffiliate =
      filters.affiliate === "All" || r.affiliate === filters.affiliate;
    const matchOffer =
      filters.offer === "All" || r.serviceName === filters.offer;
    return matchPartner && matchAffiliate && matchOffer;
  });

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

  const exportExcel = () => {
    const filename = `Mob13r_Report_${new Date()
      .toISOString()
      .split("T")[0]}.xlsx`;
    const ws = XLSX.utils.json_to_sheet(filteredReports);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reports");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([excelBuffer]), filename);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Mob13r Admin Report", 14, 12);
    autoTable(doc, {
      startY: 18,
      head: [
        [
          "Date",
          ...(visibleCols.partnerServiceId ? ["Partner service Id"] : []),
          ...(visibleCols.publisherCampaignId ? ["Publisher campaign ID"] : []),
          ...(visibleCols.partner ? ["Partner"] : []),
          ...(visibleCols.affiliate ? ["Affiliate"] : []),
          ...(visibleCols.geo ? ["Geo"] : []),
          ...(visibleCols.carrier ? ["Carrier"] : []),
          ...(visibleCols.serviceName ? ["Partner’s service name"] : []),
          ...(visibleCols.clicks ? ["Clicks"] : []),
          ...(visibleCols.partnerConversions ? ["Partner conversions"] : []),
          ...(visibleCols.affiliateConversions ? ["Affiliate conversions"] : []),
          ...(visibleCols.revenue ? ["Revenue($)"] : []),
          ...(visibleCols.cost ? ["Cost to affiliate($)"] : []),
          ...(visibleCols.profit ? ["Profit($)"] : []),
        ],
      ],
      body: filteredReports.map((r) => [
        r.date,
        ...(visibleCols.partnerServiceId ? [r.partnerServiceId] : []),
        ...(visibleCols.publisherCampaignId ? [r.publisherCampaignId] : []),
        ...(visibleCols.partner ? [r.partner] : []),
        ...(visibleCols.affiliate ? [r.affiliate] : []),
        ...(visibleCols.geo ? [r.geo] : []),
        ...(visibleCols.carrier ? [r.carrier] : []),
        ...(visibleCols.serviceName ? [r.serviceName] : []),
        ...(visibleCols.clicks ? [r.clicks] : []),
        ...(visibleCols.partnerConversions ? [r.partnerConversions] : []),
        ...(visibleCols.affiliateConversions ? [r.affiliateConversions] : []),
        ...(visibleCols.revenue ? [`$${r.revenue.toFixed(2)}`] : []),
        ...(visibleCols.cost ? [`$${r.cost.toFixed(2)}`] : []),
        ...(visibleCols.profit ? [`$${r.profit.toFixed(2)}`] : []),
      ]),
    });
    doc.save(`Mob13r_Report_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <div className="admin-dashboard">
      <h2>Mob13r Admin Dashboard</h2>

      <div className="filters">
        <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
        <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
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

        {/* 🔽 Column Visibility Filter */}
        <div className="column-toggle">
          <span>Show / Hide Columns</span>
          <div className="column-dropdown">
            {Object.keys(visibleCols).map((col) => (
              <label key={col}>
                <input
                  type="checkbox"
                  checked={visibleCols[col]}
                  onChange={() => toggleColumn(col)}
                />
                {col.replace(/([A-Z])/g, " $1")}
              </label>
            ))}
          </div>
        </div>
      </div>

      <table className="report-table">
        <thead>
          <tr>
            <th>Date</th>
            {visibleCols.partnerServiceId && <th>Partner service Id</th>}
            {visibleCols.publisherCampaignId && <th>Publisher campaign ID</th>}
            {visibleCols.partner && <th>Partner</th>}
            {visibleCols.affiliate && <th>Affiliate</th>}
            {visibleCols.geo && <th>Geo</th>}
            {visibleCols.carrier && <th>Carrier</th>}
            {visibleCols.serviceName && <th>Partner’s service name</th>}
            {visibleCols.clicks && <th>Clicks</th>}
            {visibleCols.partnerConversions && <th>Partner conversions</th>}
            {visibleCols.affiliateConversions && <th>Affiliate conversions</th>}
            {visibleCols.revenue && <th>Revenue($)</th>}
            {visibleCols.cost && <th>Cost to affiliate($)</th>}
            {visibleCols.profit && <th>Profit($)</th>}
          </tr>
        </thead>
        <tbody>
          {filteredReports.map((r, i) => (
            <tr key={i}>
              <td>{r.date}</td>
              {visibleCols.partnerServiceId && <td>{r.partnerServiceId}</td>}
              {visibleCols.publisherCampaignId && <td>{r.publisherCampaignId}</td>}
              {visibleCols.partner && <td>{r.partner}</td>}
              {visibleCols.affiliate && <td>{r.affiliate}</td>}
              {visibleCols.geo && <td>{r.geo}</td>}
              {visibleCols.carrier && <td>{r.carrier}</td>}
              {visibleCols.serviceName && <td>{r.serviceName}</td>}
              {visibleCols.clicks && <td>{r.clicks}</td>}
              {visibleCols.partnerConversions && <td>{r.partnerConversions}</td>}
              {visibleCols.affiliateConversions && <td>{r.affiliateConversions}</td>}
              {visibleCols.revenue && <td>${r.revenue?.toFixed(2) || "—"}</td>}
              {visibleCols.cost && <td>${r.cost?.toFixed(2) || "—"}</td>}
              {visibleCols.profit && <td>${r.profit?.toFixed(2) || "—"}</td>}
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
