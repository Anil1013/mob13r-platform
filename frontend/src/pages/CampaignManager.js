import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/AdminDashboard.css";

const CampaignManager = () => {
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    axios
      .get(`${process.env.REACT_APP_API_URL}/admin/campaigns`)
      .then((res) => setCampaigns(res.data))
      .catch((err) => console.error("Error:", err));
  }, []);

  const updateForwardPercent = async (id, value) => {
    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/admin/campaigns/${id}/forward-percentage`,
        { forward_percentage: value }
      );
      alert("✅ Forward % updated!");
    } catch {
      alert("Update failed");
    }
  };

  return (
    <div className="campaign-manager">
      <h3>🎯 Campaign Manager</h3>
      <table className="campaign-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Affiliate</th>
            <th>Type</th>
            <th>Forward %</th>
            <th>Update</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.affiliate_name}</td>
              <td>{c.type}</td>
              <td>
                <input
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={c.forward_percentage}
                  onChange={(e) =>
                    (c.forward_percentage = e.target.value)
                  }
                />
              </td>
              <td>
                <button
                  onClick={() =>
                    updateForwardPercent(c.id, c.forward_percentage)
                  }
                >
                  💾 Save
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CampaignManager;
