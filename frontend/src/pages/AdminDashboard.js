import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "./AdminDashboard.css";

const API_URL = process.env.REACT_APP_API_URL || "https://backend.mob13r.com/api";

const AdminDashboard = () => {
  const [reports, setReports] = useState([]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    partner: "All",
    affiliate: "All",
    offer: "All",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/admin/reports`);
      setReports(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  const exportCSV = () => {
    const ws = XLSX.utils.json_to_sheet(reports);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reports");
    XLSX.writeFile(wb, "Mob13r_Report.csv");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.autoTable({
      html: "#reportsTable",
      styles: { halign: "center", fontSize: 8 },
      headStyles: { fillColor: [22, 160, 133], textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [22, 160, 133], textColor: 255, fontStyle: "bold" },
    });
    doc.save("Mob13r_Report.pdf");
  };

  const totals = reports.reduce(
    (acc, r) => ({
      clicks: acc.clicks + (r.clicks || 0),
      partnerConversions: acc.partnerConversions + (r.partnerConversions || 0),
      affiliateConversions: acc.affiliateConversions + (r.affiliateConversions || 0),
      revenue: acc.revenue + (r.revenue || 0),
      cost: acc.cost + (r.cost || 0),
      profit: acc.profit + (r.profit || 0),
    }),
    { clicks: 0, partnerConversions: 0, affiliateConversions: 0, revenue: 0, cost: 0, profit: 0 }
  );

  return (
    <div className="dashboard">
      <h2 className="title">Mob13r Admin Dashboard</h2>

      <div className="filters">
        <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
        <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
        <select name="partner" onChange={handleFilterChange}>
          <option>All Partners</option>
          <option>Partner 1</option>
          <option>Partner 2</option>
          <option>Partner 3</option>
          <option>Partner 4</option>
        </select>
        <select name="affiliate" onChange={handleFilterChange}>
          <option>All Affiliates</option>
          <option>Affiliate 1</option>
          <option>Affiliate 2</option>
          <option>Affiliate 3</option>
          <option>Affiliate 4</option>
        </select>
        <select name="offer" onChange={handleFilterChange}>
          <option>All Offers</option>
          <option>Game 1</option>
          <option>BALADNA</option>
          <option>Prizes</option>
          <option>Playnew</option>
        </select>
        <button className="apply-btn" onClick={fetchData}>
          Apply / Refresh
        </button>
        <button onClick={exportCSV}>Export CSV</button>
        <button onClick={exportPDF}>Export PDF</button>
      </div>

      <table id="reportsTable" className="report-table">
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
          {reports.map((r, i) => (
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
              <td>${r.revenue}</td>
              <td>${r.cost}</td>
              <td>${r.profit}</td>
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
};

export default AdminDashboard;
