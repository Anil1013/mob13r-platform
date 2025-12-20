import { useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();

  return (
    <header style={styles.header}>
      <h1 style={styles.title}>Dashboard</h1>
      <button style={styles.logout} onClick={() => navigate("/login")}>
        Logout
      </button>
    </header>
  );
}

const styles = {
  header: {
    background: "#0f172a",
    padding: "16px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#fff",
  },
  title: {
    margin: 0,
  },
  logout: {
    background: "#dc2626",
    border: "none",
    padding: "8px 14px",
    borderRadius: "8px",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },
};
