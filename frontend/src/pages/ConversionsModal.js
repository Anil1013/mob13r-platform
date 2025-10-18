import React, { useEffect, useState } from "react";
import axios from "axios";

const ConversionsModal = ({ campaign, onClose, apiUrl }) => {
  const [conversions, setConversions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchConversions = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${apiUrl}/admin/campaigns/${campaign.id}/conversions`);
      setConversions(res.data);
    } catch (err) {
      console.error("Error fetching conversions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async (conversionId) => {
    try {
      await axios.post(`${apiUrl}/admin/conversions/${conversionId}/release`);
      fetchConversions();
    } catch (err) {
      console.error("Error releasing conversion:", err);
    }
  };

  useEffect(() => {
    fetchConversions();
  }, []);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>
          💹 Conversions for: <span style={{ color: "#00ffff" }}>{campaign.affiliate_name}</span>
        </h3>
        <button onClick={onClose} className="close-btn">✖</button>

        {loading ? (
          <p>Loading conversions...</p>
        ) : conversions.length === 0 ? (
          <p>No conversions found.</p>
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>MSISDN</th>
                <th>Status</th>
                <th>Timestamp</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {conversions.map((conv) => (
                <tr key={conv.id}>
                  <td>{conv.id}</td>
                  <td>{conv.msisdn}</td>
                  <td>{conv.status}</td>
                  <td>{new Date(conv.timestamp).toLocaleString()}</td>
                  <td>
                    <button
                      onClick={() => handleRelease(conv.id)}
                      className="navbar-button"
                      style={{ padding: "4px 10px", fontSize: "13px" }}
                    >
                      Release
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ConversionsModal;

/* Add modal CSS here or in AdminDashboard.css */
