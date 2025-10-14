import React, { useEffect, useState } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_URL = process.env.REACT_APP_API_URL || "https://backend.mob13r.com/api";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("reports");
  const [affiliates, setAffiliates] = useState([]);
  const [partners, setPartners] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [affRes, partRes, offRes] = await Promise.all([
          axios.get(`${API_URL}/admin/affiliates`),
          axios.get(`${API_URL}/admin/partners`),
          axios.get(`${API_URL}/admin/offers`),
        ]);
        setAffiliates(affRes.data || []);
        setPartners(partRes.data || []);
        setOffers(offRes.data || []);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return (
      <div style={styles.loadingContainer}>
        <div className="loader"></div>
        <p style={{ color: "#94a3b8", marginTop: 10 }}>Loading Mob13r Dashboard…</p>
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
            0% { transform: rotate(0); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );

  const ReportsSection = () => (
    <div style={styles.section}>
      <h2 style={styles.heading}>📊 Day-wise Reports</h2>
      <p style={{ color: "#94a3b8", marginBottom: "20px" }}>
        Combined overview of Affiliates, Partners, and Offers.
      </p>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Total Affiliates</th>
              <th>Total Partners</th>
              <th>Total Offers</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(7)].map((_, i) => {
              const date = new Date();
              date.setDate(date.getDate() - i);
              const formatted = date.toISOString().split("T")[0];
              return (
                <tr key={i}>
                  <td>{formatted}</td>
                  <td>{affiliates.length}</td>
                  <td>{partners.length}</td>
                  <td>{offers.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const AffiliatesSection = () => (
    <div style={styles.section}>
      <h2 style={styles.heading}>👥 Affiliates</h2>
      <p style={{ color: "#94a3b8" }}>Affiliate management tools will appear here.</p>
    </div>
  );

  const PartnersSection = () => (
    <div style={styles.section}>
      <h2 style={styles.heading}>🤝 Partners</h2>
      <p style={{ color: "#94a3b8" }}>Partner management tools will appear here.</p>
    </div>
  );

  const OffersSection = () => (
    <div style={styles.section}>
      <h2 style={styles.heading}>🎯 Offers</h2>
      <p style={{ color: "#94a3b8" }}>Offer management tools will appear here.</p>
    </div>
  );

  return (
    <div style={styles.container}>
      <ToastContainer position="top-right" theme="dark" />
      <nav style={styles.navbar}>
  <h1 style={styles.title}>Mob13r Admin Dashboard</h1>
  <div style={styles.navLinks}>
    {["reports", "affiliates", "partners", "offers"].map((tab) => (
      <button
        key={tab}
        style={{
          ...styles.navButton,
          ...(activeTab === tab ? styles.activeTab : {}),
        }}
        onClick={() => setActiveTab(tab)}
      >
        {tab.charAt(0).toUpperCase() + tab.slice(1)}
      </button>
    ))}
  </div>
</nav>

{activeTab === "reports" && <ReportsSection />}
{activeTab === "affiliates" && <AffiliatesSection />}
{activeTab === "partners" && <PartnersSection />}
{activeTab === "offers" && <OffersSection />}


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
  navLinks: { display: "flex", gap: 25 },
  navButton: {
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    fontSize: "1rem",
    cursor: "pointer",
    padding: "6px 12px",
  },
  activeTab: { color: "#4cc9f0", borderBottom: "2px solid #4cc9f0" },
  section: { padding: 40 },
  heading: { fontSize: "1.3rem", color: "#4cc9f0", marginBottom: 10 },
  tableWrapper: {
    overflowX: "auto",
    background: "#0e162b",
    borderRadius: 8,
    padding: 10,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    color: "#cbd5e1",
  },
  footer: {
    textAlign: "center",
    borderTop: "1px solid #1e2a47",
    paddingTop: 15,
    color: "#64748b",
    fontSize: ".85rem",
    marginTop: 40,
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
