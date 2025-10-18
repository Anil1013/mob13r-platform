import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/AdminDashboard.css";

const ConversionsModal = ({ campaignId, onClose }) => {
  const [conversions, setConversions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // Fetch conversions when modal opens
  useEffect(() => {
    if (!campaignId) return;
    const fetchConversions = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/admin/campaigns/${campaignId}/conversions`
        );
        setConversions(res.data);
      } catch (err) {
        console.error("Error fetching conversions:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchConversions();
  }, [campaignId]);

  // Select/unselect conversions
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Manual forward selected
  const handleForwardSelected = async () => {
    if (selectedIds.length === 0) return alert("No conversions selected");
    if (
      !window.confirm(
        `Forward ${selectedIds.length} selected conversions to affiliate?`
      )
    )
      return;

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/admin/campaigns/${campaignId}/forward-manual`,
        { conversion_ids: selectedIds }
      );
      alert("✅ Selected conversions forwarded!");
      // Refresh list
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/admin/campaigns/${campaignId}/conversions`
      );
      setConversions(res.data);
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      alert("Failed to forward selected conversions");
    }
  };

  if (!campaignId) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h3>🧾 Conversions — Campaign #{campaignId}</h3>
          <button onClick={onClose} className="close-btn">
            ✖
          </button>
        </div>

        {loading ? (
          <div className="modal-loading">Loading conversions...</div>
        ) : conversions.length === 0 ? (
          <div className="modal-empty">No conversions found.</div>
        ) : (
          <>
            <div className="conversion-table-wrapper">
              <table className="conversion-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        onChange={(e) =>
                          setSelectedIds(
                            e.target.checked
                              ? conversions.map((c) => c.id)
                              : []
                          )
                        }
                        checked={
                          selectedIds.length > 0 &&
                          selectedIds.length === conversions.length
                        }
                      />
                    </th>
                    <th>ID</th>
                    <th>Click ID</th>
                    <th>MSISDN</th>
                    <th>Status</th>
                    <th>Revenue</th>
                    <th>Forwarded</th>
                    <th>Received At</th>
                  </tr>
                </thead>
                <tbody>
                  {conversions.map((c) => (
                    <tr
                      key={c.id}
                      className={c.forwarded ? "forwarded" : "held"}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(c.id)}
                          onChange={() => toggleSelect(c.id)}
                        />
                      </td>
                      <td>{c.id}</td>
                      <td>{c.click_id}</td>
                      <td>{c.msisdn || "-"}</td>
                      <td>{c.status}</td>
                      <td>${parseFloat(c.revenue || 0).toFixed(2)}</td>
                      <td>
                        {c.forwarded ? (
                          <span className="badge success">YES</span>
                        ) : (
                          <span className="badge held">NO</span>
                        )}
                      </td>
                      <td>
                        {new Date(c.received_at).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedIds.length > 0 && (
              <div className="modal-actions">
                <button onClick={handleForwardSelected} className="forward-btn">
                  🚀 Forward Selected ({selectedIds.length})
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ConversionsModal;

