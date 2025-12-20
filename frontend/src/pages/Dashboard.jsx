import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h1>Mob13r Dashboard</h1>
        <button onClick={handleLogout} style={styles.logout}>
          Logout
        </button>
      </div>

      <p>Offers, publishers, analytics coming next…</p>
    </div>
  );
}

const styles = {
  wrapper: {
    padding: "32px",
    color: "#fff",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  logout: {
    background: "#dc2626",
    border: "none",
    padding: "10px 16px",
    borderRadius: "8px",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },
};
