import { NavLink, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("token_expiry");
    navigate("/login", { replace: true });
  };

  return (
    <div style={styles.navbar}>
      {/* Left */}
      <div style={styles.left}>
        <div style={styles.logo} onClick={() => navigate("/dashboard")}>
          Mob13r
        </div>

        <NavLink
          to="/dashboard"
          style={({ isActive }) =>
            isActive ? styles.activeLink : styles.link
          }
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/advertisers"
          style={({ isActive }) =>
            isActive ? styles.activeLink : styles.link
          }
        >
          Advertisers
        </NavLink>
      </div>

      {/* Right */}
      <div style={styles.right}>
        <span style={styles.user}>{user?.email}</span>
        <button style={styles.logoutBtn} onClick={logout}>
          Logout
        </button>
      </div>
    </div>
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
  left: {
    display: "flex",
    alignItems: "center",
    gap: 20,
  },
  logo: {
    fontSize: 20,
    fontWeight: "bold",
    cursor: "pointer",
  },
  link: {
    color: "#9ca3af",
    textDecoration: "none",
    fontSize: 14,
  },
  activeLink: {
    color: "#ffffff",
    textDecoration: "underline",
    fontSize: 14,
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  user: {
    fontSize: 13,
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
};
