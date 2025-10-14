import React, { useEffect, useState } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_URL = process.env.REACT_APP_API_URL || "https://backend.mob13r.com/api";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("affiliates");
  const [affiliates, setAffiliates] = useState([]);
  const [partners, setPartners] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newOffer, setNewOffer] = useState({
    name: "",
    geo: "",
    carrier: "",
    partner_id: "",
    partner_cpa: "",
    ref_url: "",
    request_url: "",
    verify_url: "",
  });

  // ✅ Fetch data using axios
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [affRes, partRes, offRes] = await Promise.all([
          axios.get(`${API_URL}/admin/affiliates`),
          axios.get(`${API_URL}/admin/partners`),
          axios.get(`${API_URL}/admin/offers`),
        ]);

        setAffiliates(affRes.data);
        setPartners(partRes.data);
        setOffers(offRes.data);
      } catch (error) {
        console.error("❌ Error loading admin data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ✅ Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewOffer({ ...newOffer, [name]: value });
  };

  // ✅ Create new offer
  const handleAddOffer = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/admin/offers`, newOffer);
      setOffers([...offers, res.data]);
      setNewOffer({
        name: "",
        geo: "",
        carrier: "",
        partner_id: "",
        partner_cpa: "",
        ref_url: "",
        request_url: "",
        verify_url: "",
      });
      toast.success("✅ Offer added successfully!");
    } catch (error) {
      console.error(error);
      toast.error("❌ Failed to create offer");
    }
  };

  // ✅ Delete offer
  const handleDeleteOffer = async (id) => {
    if (!window.confirm("Are you sure you want to delete this offer?")) return;
    try {
      await axios.delete(`${API_URL}/admin/offers/${id}`);
      setOffers(offers.filter((o) => o.id !== id));
      toast.info("🗑 Offer deleted");
    } catch (error) {
      console.error(error);
      toast.error("❌ Failed to delete offer");
    }
  };

  const filteredAffiliates = affiliates.filter((a) =>
    a.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading)
    return (
      <div style={styles.loadingContainer}>
        <div className="loader"></div>
        <p style={{ color: "#94a3b8", marginTop: "10px" }}>Loading Mob13r Dashboard...</p>
        <style>{`
          .loader {
            border: 6px solid #1e293b;
            border-top: 6px solid #4cc9f0;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );

  // ✅ Dynamic section rendering
  const renderContent = () => {
    switch (activeTab) {
      case "affiliates":
        return (
          <div style={styles.section}>
            <h2 style={styles.heading}>Affiliates</h2>
            <input
              type="text"
              placeholder="Search affiliates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchBox}
            />
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAffiliates.map((a) => (
                    <tr key={a.id}>
                      <td>{a.id}</td>
                      <td>{a.name}</td>
                      <td>{a.email}</td>
                      <td>{a.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "partners":
        return (
          <div style={styles.section}>
            <h2 style={styles.heading}>Partners</h2>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>API Base</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map((p) => (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td>{p.name}</td>
                      <td>{p.api_base}</td>
                      <td>{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "offers":
        return (
          <div style={styles.section}>
            <h2 style={styles.heading}>Offers Management</h2>
            <form onSubmit={handleAddOffer} style={styles.form}>
              <input name="name" placeholder="Offer Name" value={newOffer.name} onChange={handleChange} required />
              <input name="geo" placeholder="Geo (e.g. OM)" value={newOffer.geo} onChange={handleChange} />
              <input name="carrier" placeholder="Carrier" value={newOffer.carrier} onChange={handleChange} />
              <select name="partner_id" value={newOffer.partner_id} onChange={handleChange} required>
                <option value="">Select Partner</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <input name="partner_cpa" placeholder="Partner CPA" value={newOffer.partner_cpa} onChange={handleChange} />
              <input name="ref_url" placeholder="Ref URL" value={newOffer.ref_url} onChange={handleChange} />
              <input name="request_url" placeholder="Request URL" value={newOffer.request_url} onChange={handleChange} />
              <input name="verify_url" placeholder="Verify URL" value={newOffer.verify_url} onChange={handleChange} />
              <button type="submit" style={styles.addBtn}>➕ Add Offer</button>
            </form>

            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Geo</th>
                    <th>Carrier</th>
                    <th>Partner</th>
                    <th>CPA</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((o) => (
                    <tr key={o.id}>
                      <td>{o.id}</td>
                      <td>{o.name}</td>
                      <td>{o.geo}</td>
                      <td>{o.carrier}</td>
                      <td>{o.Partner?.name}</td>
                      <td>{o.partner_cpa}</td>
                      <td>{o.status}</td>
                      <td>
                        <button onClick={() => handleDeleteOffer(o.id)} style={styles.deleteBtn}>🗑 Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      <ToastContainer position="top-right" theme="dark" />
      <nav style={styles.navbar}>
        <h1 style={styles.title}>Mob13r Admin Dashboard</h1>
        <div style={styles.navLinks}>
          <button
            style={{ ...styles.navButton, ...(activeTab === "affiliates" ? styles.activeTab : {}) }}
            onClick={() => setActiveTab("affiliates")}
          >
            Affiliates
          </button>
          <button
            style={{ ...styles.navButton, ...(activeTab === "partners" ? styles.activeTab : {}) }}
            onClick={() => setActiveTab("partners")}
          >
            Partners
          </button>
          <button
            style={{ ...styles.navButton, ...(activeTab === "offers" ? styles.activeTab : {}) }}
            onClick={() => setActiveTab("offers")}
          >
            Offers Management
          </button>
        </div>
      </nav>

      {renderContent()}

      <footer style={styles.footer}>
        <p>© 2025 Mob13r Platform — all rights reserved</p>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: "#0b1221",
    color: "#e6eef8",
    minHeight: "100vh",
    fontFamily: "system-ui, sans-serif",
  },
  navbar: {
    background: "#111b34",
    padding: "20px 40px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #1e2a47",
  },
  title: { fontSize: "1.5rem", color: "#4cc9f0" },
  navLinks: { display: "flex", gap: "25px" },
  navButton: {
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    fontSize: "1rem",
    cursor: "pointer",
    padding: "6px 12px",
  },
  activeTab: {
    color: "#4cc9f0",
    borderBottom: "2px solid #4cc9f0",
  },
  section: { padding: "40px" },
  heading: { fontSize: "1.3rem", color: "#4cc9f0", marginBottom: 10 },
  searchBox: {
    background: "#111b34",
    color: "#fff",
    border: "1px solid #4cc9f0",
    borderRadius: "6px",
    padding: "8px 12px",
    marginBottom: "10px",
    width: "250px",
  },
  form: {
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    background: "#0e162b",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "15px",
  },
  addBtn: {
    gridColumn: "span 2",
    background: "#4cc9f0",
    border: "none",
    padding: "10px",
    borderRadius: "6px",
    cursor: "pointer",
    color: "#0b1221",
    fontWeight: "bold",
  },
  deleteBtn: {
    background: "#ef4444",
    border: "none",
    padding: "6px 10px",
    borderRadius: "4px",
    color: "#fff",
    cursor: "pointer",
  },
  tableWrapper: {
    overflowX: "auto",
    backgroundColor: "#0e162b",
    borderRadius: "8px",
    padding: "10px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    color: "#cbd5e1",
  },
  footer: {
    textAlign: "center",
    borderTop: "1px solid #1e2a47",
    paddingTop: "15px",
    color: "#64748b",
    fontSize: "0.85rem",
    marginTop: "50px",
  },
  loadingContainer: {
    background: "#0b1221",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
};
