import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

export default function Dashboard() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* LEFT SIDEBAR */}
      <Sidebar />

      {/* RIGHT CONTENT */}
      <div style={styles.content}>
        <Header />

        <div style={styles.body}>
          <h2>Welcome to Mob13r Dashboard</h2>
          <p>Offers, publishers, analytics coming next…</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  content: {
    flex: 1,
    background: "#020617",
    color: "#fff",
  },
  body: {
    padding: "24px",
  },
};
