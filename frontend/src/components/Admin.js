import React, { useEffect, useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000/api";

export default function AdminDashboard() {
  const [affiliates, setAffiliates] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [affRes, partRes] = await Promise.all([
          fetch(`${API_URL}/admin/affiliates`),
          fetch(`${API_URL}/admin/partners`)
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

  if (loading) return <div style={styles.loading}>Loading Dashboard...</div>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Mob13r.api — Admin Dashboard</h1>
      <p style={styles.subtitle}>Dark Mode Theme</p>

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
    padding: "30px",
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
