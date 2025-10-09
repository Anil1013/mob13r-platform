import React from "react";
import AdminDashboard from "./pages/AdminDashboard";
import AffiliateDashboard from "./pages/AffiliateDashboard";
import PartnerDashboard from "./pages/PartnerDashboard";
import Header from "./components/Header";

function App() {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", background: "#0b1221", color: "#e6eef8", minHeight: "100vh", padding: 20 }}>
      <Header />
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
        <AdminDashboard />
        <AffiliateDashboard />
        <PartnerDashboard />
      </div>
    </div>
  );
}

export default App;
