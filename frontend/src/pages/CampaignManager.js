import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/AdminDashboard.css"; // reuse same CSS

const CampaignManager = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchCampaigns = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/admin/campaigns`);
      setCampaigns(res.data);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const openModal = (campaign) => {
    setSelectedCampaign(campaign);
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedCampaign(null);
    setShowModal(false);
  };

  const handleForwardChange = async (id, value) => {
    setLoading(true);
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/admin/campaigns/${id}/forward-percentage`, {
        forward_percentage: parseInt(value),
      });
      fetchCampaigns();
    } catch (err) {
      console.error("Error updating percentage:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-top">
        <div className="auto-refresh-left">⚙️ Campaign Management</div>
        <h2 className="dashboard-title">🎯 Affiliate Campaigns</h2>
        <div className="navbar-area">
          <button className="navbar-button">Partners</button>
          <button className="navbar-button">Affiliates</button>
          <button className="navbar-button">Services</button>
          <button className="navbar-button">Reports</button>
        </div>
      </div>

      <div className="filters">
        <button onClick={fetchCampaigns}>🔄 Refresh</button>
        <span>Total Campaigns: {campaigns.length}</span>
      </div>

      <table className="report-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Affiliate Name</th>
            <th>Type</th>
            <th>Geo</th>
            <th>Carrier</th>
            <th>Forward %</th>
            <th>Landing Page</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.affiliate_name}</td>
              <td>{c.type}</td>
              <td>{c.geo || "-"}</td>
              <td>{c.carrier || "-"}</td>
              <td>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={c.forward_percentage}
                  disabled={loading}
                  onChange={(e) => handleForwardChange(c.id, e.target.value)}
                  style={{
                    width: "60px",
                    textAlign: "center",
                    background: "#0e1015",
                    color: "#00ffff",
                    border: "1px solid rgba(0,255,255,0.3)",
                    borderRadius: "6px",
                  }}
                />
              </td>
              <td>
                <a
                  href={c.landing_page_url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#00ffff" }}
                >
                  {c.landing_page_url ? "View" : "Generate"}
                </a>
              </td>
              <td>
                <button
                  onClick={() => openModal(c)}
                  className="navbar-button"
                  style={{ padding: "4px 10px", fontSize: "13px" }}
                >
                  Conversions
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <ConversionsModal
          campaign={selectedCampaign}
          onClose={closeModal}
          apiUrl={process.env.REACT_APP_API_URL}
        />
      )}
    </div>
  );
};

export default CampaignManager;

// Import this after file is ready
import ConversionsModal from "./ConversionsModal";

