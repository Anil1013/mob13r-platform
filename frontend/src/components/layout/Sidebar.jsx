import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside style={styles.sidebar}>
      <h2 style={styles.brand}>Mob13r</h2>

      <nav style={styles.nav}>
        <NavLink to="/dashboard" style={styles.link}>Dashboard</NavLink>
        <NavLink to="/advertisers" style={styles.link}>Advertisers</NavLink>
        <NavLink to="/publishers" style={styles.link}>Publishers</NavLink>
        <NavLink to="/analytics" style={styles.link}>Analytics</NavLink>
        <NavLink to="/settings" style={styles.link}>Settings</NavLink>
      </nav>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: "220px",
    background: "#020617",
    color: "#fff",
    padding: "20px",
    minHeight: "100vh",
  },
  brand: {
    fontFamily: "Lora, serif",
    marginBottom: "24px",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  link: {
    color: "#cbd5f5",
    textDecoration: "none",
    fontWeight: 500,
  },
};
