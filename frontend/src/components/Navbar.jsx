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
    <>
      {/* 🔹 FIXED NAVBAR */}
      <div style={styles.navbar}>
        {/* Left */}
        <div style={styles.left}>
          <div style={styles.brand} onClick={() => navigate("/dashboard")}>
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

          <NavLink
            to="/offers"
            style={({ isActive }) =>
              isActive ? styles.activeLink : styles.link
            }
          >
            Offers
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

      {/* 🔹 Spacer so content doesn’t hide behind fixed navbar */}
      <div style={{ height: 60 }} />
    </>
  );
}

const styles = {
  navbar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: "#0f172a",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 28px",
    zIndex: 1000,
    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: 28,
  },
  brand: {
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.3px",
  },
  link: {
    color: "#cbd5f5",
    textDecoration: "none",
    fontSize: 16,
    fontWeight: 500,
  },
  activeLink: {
    color: "#ffffff",
    textDecoration: "none",
    fontSize: 16,
    fontWeight: 600,
    borderBottom: "2px solid #ffffff",
    paddingBottom: 2,
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
    padding: "7px 14px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
  },
};
