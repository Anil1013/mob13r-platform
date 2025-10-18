import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import "../styles/AdminDashboard.css";
import CampaignManager from "./CampaignManager";

const AdminDashboard = () => {
  const [reportData, setReportData] = useState([]);
  const [campaignStats, setCampaignStats] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [timer, setTimer] = useState(600);

  const fetchData = async () => {
    try {
      const [reportRes, campaignRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/admin/reports`),
        axios.get(`${process.env.REACT_APP_API_URL}/admin/campaigns/stats`),
      ]);
      setReportData(reportRes.data);
      setFilteredData(reportRes.data);
      setCampaignStats(campaignRes.data);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          fetchData();
          return 600;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const totals = useMemo(() => {
    const totalProfit = filteredData.reduce(
      (sum, r) => sum + (parseFloat(r.profit) || 0),
      0
    );
    return { totalProfit };
  }, [filteredData]);

  return (
    <div className="admin-dashboard">
      <div className="dashboard-top">
        <div className="auto-refresh-left">⏱️ {formatTime(timer)}</div>
        <h2 className="dashboard-title">📊 Mob13r Performance Dashboard</h2>
        <div className="navbar-area">
          <button>Partners</button>
          <button>Services</button>
          <button>Campaigns</button>
          <button>Reports</button>
        </div>
      </div>

      {/* ✅ Campaign stats summary cards */}
      <div className="campaign-stats-grid">
        {campaignStats.map((c) => (
          <div key={c.campaign_id} className="campaign-card">
            <div className="card-header">
              <h4>{c.campaign_name}</h4>
              <span className="type-badge">{c.type}</span>
            </div>

            <div className="card-body">
              <div className="stat">
                <strong>Received:</strong> {c.total_received}
              </div>
              <div className="stat">
                <strong>Forwarded:</strong> {c.total_forwarded}
              </div>
              <div className="stat held">
                <strong>Held:</strong>{" "}
                {c.total_received - c.total_forwarded}
              </div>
              <div className="stat">
                <strong>Forward %:</strong> {c.forward_percentage}%
              </div>
              <div className="stat">
                <strong>Profit:</strong>{" "}
                <span
                  style={{
                    color:
                      c.total_profit >= 0 ? "#00ff80" : "#ff4d4d",
                  }}
                >
                  ${c.total_profit.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="card-actions">
              {c.total_received - c.total_forwarded > 0 && (
                <button
                  className="release-btn"
                  onClick={async () => {
                    try {
                      await axios.post(
                        `${process.env.REACT_APP_API_URL}/admin/campaigns/${c.campaign_id}/release-held`
                      );
                      fetchData();
                      alert("✅ Held conversions released!");
                    } catch (e) {
                      alert("Failed to release conversions.");
                    }
                  }}
                >
                  🚀 Release Held
                </button>
              )}
              <button
                className="view-btn"
                onClick={() => alert("Conversion details modal coming soon")}
              >
                👁️ View Conversions
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Totals section */}
      <div className="totals-section">
        <h3>
          💰 Total Profit:{" "}
          <span
            style={{
              color: totals.totalProfit >= 0 ? "#00ff80" : "#ff4d4d",
              fontWeight: "bold",
            }}
          >
            ${totals.totalProfit.toFixed(2)}
          </span>
        </h3>
      </div>

      {/* Campaign Manager component placeholder */}
      <CampaignManager />
    </div>
  );
};

export default AdminDashboard;
