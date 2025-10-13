import React, { useEffect, useState } from "react";

const API_URL =
  process.env.REACT_APP_API_URL ||
  "https://backend.mob13r.com/api";

export default function AdminDashboard() {
  const [affiliates, setAffiliates] = useState([]);
  const [partners, setPartners] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // New offer form state
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

  // ✅ Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [affRes, partRes, offRes] = await Promise.all([
          fetch(`${API_URL}/admin/affiliates`),
          fetch(`${API_URL}/admin/partners`),
          fetch(`${API_URL}/admin/offers`),
        ]);
        const affData = await affRes.json();
        const partData = await partRes.json();
        const offData = await offRes.json();

        setAffiliates(affData);
        setPartners(partData);
        setOffers(offData);
      } catch (error) {
        console.error("Error loading admin data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ✅ Handle form input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewOffer({ ...newOffer, [name]: value });
  };

  // ✅ Create new offer
  const handleAddOffer = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/admin/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOffer),
      });

      if (!res.ok) throw new Error("Failed to create offer");
      const created = await res.json();
      setOffers([...offers, created]);
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
      alert("✅ Offer added successfully!");
    } catch (error) {
      console.error(error);
      alert("❌ Failed to create offer");
    }
  };

  // ✅ Delete offer
  const handleDeleteOffer = async (id) => {
    if (!window.confirm("Are you sure you want to delete this offer?")) return;
    try {
      const res = await fetch(`${API_URL}/admin/offers/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete offer");
      setOffers(offers.filter((o) => o.id !== id));
    } catch (error) {
      console.error(error);
      alert("❌ Failed to delete offer");
    }
  };

  // ✅ Filter affiliates by search
  const filteredAffiliates = affiliates.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading)
    return <div style={styles.loading}>🚀 Loading Mob13r Dashboard...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Mob13r — Admin Dashboard</h1>
        <p style={styles.subtitle}>Dark Mode Theme • Managed</p>
      </header>

      {/* Stats */}
      <section style={styles.statsGrid}>
        <div style={styles.statCard}>
          <h2>{affiliates.length}</h2>
          <p>Affiliates</p>
        </div>
        <div style={styles.statCard}>
          <h2>{partners.length}</h2>
          <p>Partners</p>
        </div>
        <div style={styles.statCard}>
          <h2>{offers.length}</h2>
          <p>Offers</p>
        </div>
      </section>

      {/* Affiliates Table */}
      <div style={styles.tableSection}>
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

      {/* Partners Table */}
      <div style={styles.tableSection}>
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

      {/* Offers Management */}
      <div style={styles.tableSection}>
        <h2 style={styles.heading}>Offers Management</h2>

        {/* Add Offer Form */}
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

        {/* Offers Table */}
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
                    <button
                      onClick={() => handleDeleteOffer(o.id)}
                      style={styles.deleteBtn}
                    >
                      🗑 Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
    padding: "40px",
    fontFamily: "system-ui, sans-serif",
  },
  header: { marginBottom: 30 },
  title: { fontSize: "2.2rem", color: "#4cc9f0", margin: 0 },
  subtitle: { color: "#94a3b8", fontSize: "0.95rem", marginTop: 5 },
  statsGrid: {
    display: "flex",
    gap: "20px",
    marginBottom: "40px",
    flexWrap: "wrap",
  },
  statCard: {
    flex: "1 1 200px",
    backgroundColor: "#111b34",
    borderRadius: "12px",
    padding: "25px",
    textAlign: "center",
    boxShadow: "0 0 12px rgba(0,0,0,0.4)",
  },
  tableSection: { marginBottom: 40 },
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
  loading: {
    color: "#fff",
    background: "#0b1221",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    fontSize: "1.5rem",
  },
};
