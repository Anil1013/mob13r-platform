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

  const [timer, setTimer] = useState(600); // 10 min refresh
  const [activeTab, setActiveTab] = useState("dashboard");

  // 🔹 Partner & Service Management
  const [partners, setPartners] = useState([]);
  const [services, setServices] = useState([]);
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [newPartner, setNewPartner] = useState("");
  const [newService, setNewService] = useState({ partnerId: "", name: "" });

  // Auto-generate numeric service ID
  const generateServiceId = () => {
    const nextId =
      services.length > 0
        ? Math.max(...services.map((s) => s.id)) + 1
        : 1001;
    return nextId;
  };

  const addPartner = () => {
    if (!newPartner.trim()) return alert("Enter Partner name");
    setPartners([...partners, { id: partners.length + 1, name: newPartner }]);
    setNewPartner("");
    setShowAddPartner(false);
  };

  const addService = () => {
    if (!newService.partnerId || !newService.name.trim())
      return alert("Enter all fields");
    const newId = generateServiceId();
    setServices([
      ...services,
      {
        id: newId,
        partnerId: parseInt(newService.partnerId),
        name: newService.name,
      },
    ]);
    setNewService({ partnerId: "", name: "" });
    setShowAddService(false);
  };

  // Fetch Reports
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

  // Auto Refresh Timer
  useEffect(() => {
    fetchData();

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          fetchData();
          return 600;
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

  // Apply Filters
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

  // Totals
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

  // Export Functions
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

  const toggleColumn = (key) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Navbar
  const Navbar = () => (
    <div className="navbar">
      <div className="nav-left">
        <h1 className="brand">Mob13r Admin</h1>
      </div>
      <div className="nav-links">
        <button
          className={activeTab === "dashboard" ? "active" : ""}
          onClick={() => setActiveTab("dashboard")}
        >
          📊 Dashboard
        </button>
        <button
          className={activeTab === "partners" ? "active" : ""}
          onClick={() => setActiveTab("partners")}
        >
          🧑‍💼 Partners
        </button>
        <button
          className={activeTab === "services" ? "active" : ""}
          onClick={() => setActiveTab("services")}
        >
          ⚙️ Services
        </button>
        <button
          className={activeTab === "affiliates" ? "active" : ""}
          onClick={() => setActiveTab("affiliates")}
        >
          🤝 Affiliates
        </button>
      </div>
    </div>
  );

  // Partner Management UI
  const PartnerManagement = () => (
    <div className="management-section">
      <h2>🧑‍💼 Partner Management</h2>
      <button onClick={() => setShowAddPartner(true)}>➕ Add Partner</button>

      <table className="mini-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Partner Name</th>
          </tr>
        </thead>
        <tbody>
          {partners.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.name}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add Partner Modal */}
      {showAddPartner && (
        <div className="modal">
          <div className="modal-content">
            <h3>Add New Partner</h3>
            <input
              type="text"
              placeholder="Enter Partner Name"
              value={newPartner}
              onChange={(e) => setNewPartner(e.target.value)}
            />
            <div className="modal-buttons">
              <button onClick={addPartner}>Save</button>
              <button onClick={() => setShowAddPartner(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Service Management UI
  const ServiceManagement = () => (
    <div className="management-section">
      <h2>⚙️ Partner Services</h2>
      <button onClick={() => setShowAddService(true)}>➕ Add Service</button>

      <table className="mini-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Partner</th>
            <th>Service Name</th>
          </tr>
        </thead>
        <tbody>
          {services.map((s) => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>
                {partners.find((p) => p.id === s.partnerId)?.name || "N/A"}
              </td>
              <td>{s.name}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add Service Modal */}
      {showAddService && (
        <div className="modal">
          <div className="modal-content">
            <h3>Add New Service</h3>
            <select
              value={newService.partnerId}
              onChange={(e) =>
                setNewService({ ...newService, partnerId: e.target.value })
              }
            >
              <option value="">Select Partner</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Enter Service Name"
              value={newService.name}
              onChange={(e) =>
                setNewService({ ...newService, name: e.target.value })
              }
            />
            <div className="modal-buttons">
              <button onClick={addService}>Save</button>
              <button onClick={() => setShowAddService(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="admin-dashboard">
      <Navbar />

      {activeTab === "dashboard" && (
        <>
          <div className="dashboard-header">
            <div className="auto-refresh">
              ⏱️ Auto-refresh in {formatTime(timer)}
            </div>
            <h2>📈 Mob13r Performance Dashboard</h2>
          </div>

          <div className="filters">
            <select
              value={filters.partner}
              onChange={(e) =>
                setFilters({ ...filters, partner: e.target.value })
              }
            >
              <option value="">All Partners</option>
              {[...new Set(reportData.map((r) => r.partner))].map(
                (partner, i) => (
                  <option key={i} value={partner}>
                    {partner}
                  </option>
                )
              )}
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
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
            />

            <button onClick={applyFilters}>Apply</button>
            <button onClick={fetchData}>🔄 Refresh</button>

            <button onClick={exportToCSV}>📄 CSV</button>
            <button onClick={exportToExcel}>📘 Excel</button>
          </div>

          <table className="report-table">
            <thead>
              <tr>
                {Object.keys(visibleColumns).map(
                  (key) =>
                    visibleColumns[key] && (
                      <th key={key}>
                        {key.replaceAll("_", " ").toUpperCase()}
                      </th>
                    )
                )}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, i) => (
                <tr key={i}>
                  {Object.keys(visibleColumns).map(
                    (key) =>
                      visibleColumns[key] && (
                        <td
                          key={key}
                          style={
                            key === "profit"
                              ? {
                                  color:
                                    parseFloat(row.profit) >= 0
                                      ? "#00ff80"
                                      : "#ff4d4d",
                                  fontWeight: "bold",
                                }
                              : {}
                          }
                        >
                          {row[key]}
                        </td>
                      )
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
                {visibleColumns.profit && (
                  <td
                    style={{
                      color: totals.totalProfit >= 0 ? "#00ff80" : "#ff4d4d",
                      fontWeight: "bold",
                    }}
                  >
                    ${totals.totalProfit.toFixed(2)}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </>
      )}

      {activeTab === "partners" && <PartnerManagement />}
      {activeTab === "services" && <ServiceManagement />}
    </div>
  );
};

export default AdminDashboard;
