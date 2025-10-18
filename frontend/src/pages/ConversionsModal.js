import React, { useEffect, useState } from "react";
import axios from "axios";
import "./AdminDashboard.css";

const ConversionsModal = ({ campaign, onClose }) => {
  const [conversions, setConversions] = useState([]);
  const [releasePercent, setReleasePercent] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (campaign?.id) {
      fetchConversions();
    }
  }, [campaign]);

  const fetchConversions = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/admin/campaigns/${campaign.id}/conversions`
      );
      setConversions(res.data || []);
      setLoading(false);
    } catch (err) {
      console.error("Error loading conversions:", err.message);
      setConversions([]);
      setLoading(false);
    }
  };

  const handleRelease = async () => {
    if (!releasePercent || isNaN(releasePercent)) {
      alert("Enter a valid percentage (1–100).");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/admin/campaigns/${campaign.id}/release`,
        { percentage: parseFloat(releasePercent) }
      );
      setMessage(res.data.message || "Conversions released successfully!");
      fetchConversions();
      setLoading(false);
    } catch (err) {
      console.error("Release error:", err.message);
      setMessage("Error releasing conversions.");
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>
          🔍 Campaign #{campaign.id} – Held Conversions
        </h3>
        <button className="close-btn" onClick={onClose}>
          ✖
        </button>

        <div className="release-controls">
          <input
            type="number"
            placeholder="Enter % to release"
            value={releasePercent}
            onChange={(e) => setReleasePercent(e.target.value)}
          />
          <button onClick={handleRelease} disabled={loading}>
            🚀 Release
          </button>
        </div>

        {message && <p className="msg">{message}</p>}

        {loading ? (
          <p>Loading conversions...</p>
        ) : (
          <table className="report-table small">
            <thead>
              <tr>
                <th>ID</th>
                <th>MSISDN</th>
                <th>Status</th>
                <th>Revenue</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {conversions.length ? (
                conversions.map((conv, i) => (
                  <tr key={i}>
                    <td>{conv.id}</td>
                    <td>{conv.msisdn}</td>
                    <td>{conv.status}</td>
                    <td>${conv.revenue}</td>
                    <td>{new Date(conv.created_at).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center" }}>
                    No conversions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ConversionsModal;
