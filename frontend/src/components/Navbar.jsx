import { NavLink, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const logout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  const navStyle = ({ isActive }) =>
    isActive ? styles.activeLink : styles.link;

  return (
    <>
      <div style={styles.navbar}>
        {/* LEFT */}
        <div style={styles.left}>
          <div style={styles.brand} onClick={() => navigate("/dashboard")}>
            Mob13r
          </div>

          {/* ADMIN NAV */}
          <NavLink to="/dashboard" style={navStyle}>
            Dashboard
          </NavLink>

          <NavLink to="/advertisers" style={navStyle}>
            Advertisers
          </NavLink>

          <NavLink to="/offers" style={navStyle}>
            Offers
          </NavLink>

          <NavLink to="/publishers" style={navStyle}>
            Publishers
          </NavLink>

          <NavLink to="/publishers/assign" style={navStyle}>
            Assign Offers
          </NavLink>

          {/* PUBLISHER NAV */}
          <NavLink to="/publisher/dashboard" style={navStyle}>
            Publisher Dashboard
          </NavLink>
        </div>

        {/* RIGHT */}
        <div style={styles.right}>
          <span style={styles.user}>{user?.email}</span>
          <button style={styles.logoutBtn} onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      {/* spacer for fixed navbar */}
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
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 28px",
    zIndex: 1000,
    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
    fontFamily: "Inter, system-ui, Arial",
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: 28,
  },
  brand: {
    fontSize: 18,
    fontWeight: 700,
    cursor: "pointer",
    color: "#fff",
  },
  link: {
    color: "#cbd5f5",
    textDecoration: "none",
    fontSize: 16,
    fontWeight: 500,
  },
  activeLink: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: 600,
    borderBottom: "2px solid #ffffff",
    paddingBottom: 6,
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  user: {
    fontSize: 14,
    opacity: 0.9,
    color: "#e5e7eb",
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
