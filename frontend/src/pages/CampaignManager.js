// ===================================================
// CampaignManager.js
// Description: Admin interface to manage affiliate campaigns,
// linked partner services, and conversion control (Vas/API routes).
// ===================================================


const CampaignManager = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");

  // Fetch campaigns
  const fetchCampaigns = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/admin/campaigns`
      );
      setCampaigns(res.data || []);
      setError("");
    } catch (err) {
      console.error("Error loading campaigns:", err);
      setError("⚠️ Failed to load campaign list from backend.");
    }
  };

  // Fetch campaign statistics (profit, conversion rate, etc.)
  const fetchStats = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/admin/campaigns/stats`
      );
      setStats(res.data || []);
      setError("");
    } catch (err) {
      console.error("Error loading stats:", err);
      setError("⚠️ Failed to load campaign stats.");
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchStats();
  }, []);

  const handleOpenModal = (campaign) => {
    setSelectedCampaign(campaign);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCampaign(null);
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-top">
        <h2 className="dashboard-title">🎯 Campaign Manager</h2>
      </div>

      {error && <p className="error-msg">{error}</p>}

      {/* ===== Campaign Table ===== */}
      <table className="report-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Affiliate Name</th>
            <th>Campaign Name</th>
            <th>Type</th>
            <th>Geo</th>
            <th>Carrier</th>
            <th>Linked Partner Services</th>
            <th>Total Clicks</th>
            <th>Total Conversions</th>
            <th>Profit</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {campaigns.map((c) => {
            const stat = stats.find((s) => s.campaign_id === c.id) || {};
            return (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.affiliate_name}</td>
                <td>{c.name}</td>
                <td>{c.type}</td>
                <td>{c.geo}</td>
                <td>{c.carrier}</td>
                <td>{c.linked_services || "—"}</td>
                <td>{stat.clicks || 0}</td>
                <td>{stat.conversions || 0}</td>
                <td
                  style={{
                    color:
                      parseFloat(stat.profit) >= 0 ? "#00ff80" : "#ff4d4d",
                    fontWeight: "bold",
                  }}
                >
                  ${stat.profit?.toFixed?.(2) || "0.00"}
                </td>
                <td>
                  <button
                    className="action-btn"
                    onClick={() => handleOpenModal(c)}
                  >
                    Manage
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ===== Modal for Conversions / Manual Release ===== */}
      {showModal && selectedCampaign && (
        <
          campaign={selectedCampaign}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default CampaignManager;
