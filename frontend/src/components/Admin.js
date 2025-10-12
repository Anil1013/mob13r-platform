import React, { useEffect, useState } from "react";

const API_URL =
  process.env.REACT_APP_API_URL ||
  "http://mob13r-backend-env-1.eba-nj53dyqs.ap-south-1.elasticbeanstalk.com/api";

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
      <h1 style={styles.title}>Mob13r Dashboard</h1>
      <p style={styles.subtitle}>Connected to AWS Elastic Beanstalk Backend</p>

      {/* Stats */}
      <div style={styles.statsContainer}>
        <div style={styles.card}>
          <h3>{affiliates.length}</h3>
          <p>Affiliates</p>
        </div>
        <div style={styles.card}>
          <h3>{partners.length}</h3>
          <p>Partners</p>
        </div>
      </div>

      {/* Tables */}
      <section style={styles.section}>
        <h2 style={styles.heading}>Affiliates</h2>
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
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>Partners</h2>
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
      </section>
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
  title: {
    fontSize: "2rem",
    color: "#4cc9f0",
    marginBottom: "0",
  },
  subtitle: {
    color: "#aaa",
    marginBottom: "30px",
  },
  statsContainer: {
    display: "flex",
    gap: "20px",
    marginBottom: "40px",
  },
  card: {
    backgroundColor: "#111b34",
    padding: "20px",
    borderRadius: "10px",
    width: "150px",
    textAlign: "center",
    boxShadow: "0 0 10px rgba(0,0,0,0.3)",
  },
  section: {
    marginBottom: "40px",
  },
  heading: {
    color: "#fff",
    borderBottom: "2px solid #4cc9f0",
    paddingBottom: "10px",
    marginBottom: "15px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
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
