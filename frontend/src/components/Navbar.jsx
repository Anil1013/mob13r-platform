import { NavLink, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const user =
    JSON.parse(localStorage.getItem("user")) || { email: "Admin" };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("token_expiry");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  // ⛔ token hi nahi hai → login
  if (!token) {
    navigate("/login", { replace: true });
    return null;
  }

  const navStyle = ({ isActive }) =>
    isActive ? styles.activeLink : styles.link;

  return (
    <>
      <div style={styles.navbar}>
        <div style={styles.left}>
          <div style={styles.brand} onClick={() => navigate("/dashboard")}>
            Mob13r
          </div>

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
        </div>

        <div style={styles.right}>
          <span style={styles.user}>{user.email}</span>
          <button style={styles.logoutBtn} onClick={logout}>
            Logout
          </button>
        </div>
      </div>

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
  },
  left: { display: "flex", alignItems: "center", gap: 28 },
  brand: { fontSize: 18, fontWeight: 700, cursor: "pointer", color: "#fff" },
  link: { color: "#cbd5f5", textDecoration: "none", fontSize: 16 },
  activeLink: {
    color: "#fff",
    fontWeight: 600,
    borderBottom: "2px solid #fff",
    paddingBottom: 6,
  },
  right: { display: "flex", alignItems: "center", gap: 16 },
  user: { fontSize: 14, color: "#e5e7eb" },
  logoutBtn: {
    backgroundColor: "#ef4444",
    color: "#fff",
    border: "none",
    padding: "7px 14px",
    borderRadius: 6,
    cursor: "pointer",
  },
};
