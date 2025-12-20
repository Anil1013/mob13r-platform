import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

export default function Advertisers() {
  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div style={{ flex: 1, background: "#020617", minHeight: "100vh" }}>
        <Header />
        <div style={{ padding: "24px", color: "#fff" }}>
          <h2>Advertisers</h2>
          <p>Manage advertisers, brands, and partners here.</p>
        </div>
      </div>
    </div>
  );
}
