import React from "react";
import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import AdminDashboard from "./pages/AdminDashboard";
import CampaignManager from "./pages/CampaignManager";
import ConversionsModal from "./pages/ConversionsModal"; // optional: standalone modal route
import "./styles/AdminDashboard.css";

const App = () => {
  return (
    <Router>
      <div className="app-container">
        {/* 🔝 Top Navigation Bar */}
        <nav className="main-navbar">
          <div className="nav-left">
            <h1 className="nav-title">Mob13r Admin Panel</h1>
          </div>

          <div className="nav-links">
            <NavLink
              to="/"
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
              end
            >
              📊 Dashboard
            </NavLink>

            <NavLink
              to="/campaigns"
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              🎯 Campaign Manager
            </NavLink>

            <NavLink
              to="/conversions"
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              🔍 Conversions
            </NavLink>
          </div>
        </nav>

        {/* 🧩 Main Content Area */}
        <div className="page-container">
          <Routes>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/campaigns" element={<CampaignManager />} />
            <Route path="/conversions" element={<ConversionsModal />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
