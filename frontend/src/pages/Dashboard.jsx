import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("token_expiry");
    navigate("/login", { replace: true });
  };

  return (
    <>
      {/* 🔹 Navbar */}
      <div style={styles.navbar}>
        <div style={styles.logo}>Mob13r</div>

        <div style={styles.right}>
          <span style={styles.user}>
            {user?.email}
          </span>
          <button style={styles.logoutBtn} onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      {/* 🔹 Page Content */}
      <div style={styles.container}>
        <h1>Mob13r Dashboard</h1>
        <p>Frontend is live 🚀</p>
      </div>
    </>
  );
}

const styles = {
  navbar: {
    height: 60,
    backgroundColor: "#111827",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
  },
  logo: {
    fontSize: 20,
    fontWeight: "bold",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  user: {
    fontSize: 14,
    opacity: 0.9,
  },
  logoutBtn: {
    backgroundColor: "#ef4444",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: 6,
    cursor: "pointer",
  },
  container: {
    padding: 40,
  },
};
