import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AdminDashboard from "./pages/AdminDashboard";
import AffiliateDashboard from "./pages/AffiliateDashboard";
import PartnerDashboard from "./pages/PartnerDashboard";

function App() {
  return (
    <Router>
      <Routes>
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/admin" />} />

        {/* Individual routes */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/affiliate" element={<AffiliateDashboard />} />
        <Route path="/partner" element={<PartnerDashboard />} />

        {/* Fallback for unknown URLs */}
        <Route path="*" element={<h2 style={{ color: "white", textAlign: "center", marginTop: "40px" }}>404 — Page Not Found</h2>} />
      </Routes>
    </Router>
  );
}

export default App;
