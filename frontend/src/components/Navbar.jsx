import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  return (
    <div style={styles.navbar}>
      <div style={styles.logo} onClick={() => navigate("/")}>
        Mob13r
      </div>

      <button style={styles.logoutBtn} onClick={logout}>
        Logout
      </button>
    </div>
  );
}

const styles = {
  navbar: {
    height: 60,
    backgroundColor: "#111827",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
  },
  logo: {
    fontSize: 20,
    fontWeight: "bold",
    cursor: "pointer",
  },
  logoutBtn: {
    backgroundColor: "#ef4444",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: 6,
    cursor: "pointer",
  },
};
