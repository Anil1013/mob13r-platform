import React, { useEffect, useState } from "react";
import axios from "axios";
import "./AdminDashboard.css"; // reuse same styles
import ConversionsModal from "./ConversionsModal"; // ✅ correct path (same folder)

const CampaignManager = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/admin/campaigns`);
      setCampaigns(res.data || []);
      setLoading(false);
    } catch (err) {
      console.error("Error loading campaigns:", err.message);
      setCampaigns([]);
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/admin/campaigns/stats`);
      setStats(res.data || {});
    } catch (err) {
      console.error("Error loading stats:", err.message);
      setStats({});
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchStats();
  }, []);

  return (
    <div className="admin-dashboard">
      <div className="dashboard-top">
        <div className="navbar">
          <button className="nav-btn">Partners</button>
          <button className="nav-btn">Affiliates</button>
          <button className="nav-btn">Services</button>
          <button className="nav-btn active">Campaigns</button>
        </div>
        <h2 className="dashboard-title">🎯 Campaign Manager</h2>
      </div>

      <div className="stats-bar">
        <div className="stat-box">Total Campaigns: {campaigns.length}</div>
        <div className="stat-box">Active: {stats.active || 0}</div>
        <div className="stat-box">Paused: {stats.paused || 0}</div>
        <div className="stat-box">Held Conversions: {stats.held || 0}</div>
      </div>

      {loading ? (
        <p>Loading campaigns...</p>
      ) : (
        <table className="report-table">
          <thead>
            <tr>
              <th>Campaign ID</th>
              <th>Affiliate</th>
              <th>Partner Service(s)</th>
              <th>Geo</th>
              <th>Carrier</th>
              <th>Category</th>
              <th>Type</th>
              <th>Hold %</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c, i) => (
              <tr key={i}>
                <td>{c.id}</td>
                <td>{c.affiliate}</td>
                <td>{c.partner_service_ids?.join(", ")}</td>
                <td>{c.geo || "-"}</td>
                <td>{c.carrier || "-"}</td>
                <td>{c.category || "VAS/API"}</td>
                <td>{c.type || "Mixed"}</td>
                <td>{c.hold_percentage || 0}%</td>
                <td>
                  <button
                    className="nav-btn"
                    onClick={() => {
                      setSelectedCampaign(c);
                      setModalOpen(true);
                    }}
                  >
                    View Conversions
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <ConversionsModal
          campaign={selectedCampaign}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
};

export default CampaignManager;
