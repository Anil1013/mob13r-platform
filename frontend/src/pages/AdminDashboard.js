import React, { useEffect, useState } from "react";

const API_URL =
  process.env.REACT_APP_API_URL ||
  "https://backend.mob13r.com/api";

export default function AdminDashboard() {
  const [affiliates, setAffiliates] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [affRes, partRes] = await Promise.all([
          fetch(`${API_URL}/admin/affiliates`),
          fetch(`${API_URL}/admin/partners`),
        ]);
        const affData = await affRes.json();
        const partData = await partRes.json();
        setAffiliates(affData);
        setPartners(partData);
      } catch (error) {
        console.error("Error loading admin data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading)
    return <div style={styles.loading}>🚀 Loading Mob13r Dashboard...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Mob13r — Admin Dashboard</h1>
        <p style={styles.subtitle}>Dark Mode Theme • Connected to AWS</p>
      </header>

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
          <h2>2</h2>
          <p>Active Offers</p>
        </div>
      </section>

      <div style={styles.tableSection}>
        <h2 style={styles.heading}>Affiliates</h2>
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
              {affiliates.map((a) => (
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

      <footer style={styles.footer}>
        <p>© 2025 Mob13r Platform — Managed on AWS Amplify & Beanstalk</p>
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
  header: {
    marginBottom: "30px",
    borderBottom: "1px solid #1e2a47",
    paddingBottom: "15px",
  },
  title: {
    fontSize: "2.2rem",
    color: "#4cc9f0",
    margin: 0,
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: "0.95rem",
    marginTop: "5px",
  },
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
    transition: "transform 0.2s ease",
  },
  tableSection: {
    marginBottom: "40px",
  },
  heading: {
    fontSize: "1.3rem",
    color: "#4cc9f0",
    marginBottom: "10px",
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
