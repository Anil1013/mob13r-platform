// File: frontend/src/App.jsx

import React, { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import Sidebar from "./components/Sidebar.jsx";
import Header from "./components/Header.jsx";

// Pages
import Dashboard from "./pages/Dashboard.jsx";
import Advertisers from "./pages/Advertisers.jsx";
import Publishers from "./pages/Publishers.jsx";
import Clicks from "./pages/Clicks.jsx";
import Conversions from "./pages/Conversions.jsx";
import Postbacks from "./pages/Postbacks.jsx";
import Offers from "./pages/Offers.jsx";
import Templates from "./pages/Templates.jsx";
import PublisherTracking from "./pages/PublisherTracking.jsx";
import ApiDocs from "./pages/ApiDocs.jsx";
import FraudAlerts from "./pages/FraudAlerts.jsx";
import FraudAnalytics from "./pages/FraudAnalytics.jsx";   // ✅ NEW
import LandingBuilder from "./pages/LandingBuilder.jsx";
import TrafficDistribution from "./pages/TrafficDistribution.jsx";
import Login from "./pages/Login.jsx";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const isLoginPage = location.pathname === "/login";

  const [isLoggedIn, setIsLoggedIn] = useState(
    Boolean(localStorage.getItem("mob13r_token"))
  );

  useEffect(() => {
    const check = () => {
      setIsLoggedIn(Boolean(localStorage.getItem("mob13r_token")));
    };
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, []);

  useEffect(() => {
    if (!isLoggedIn && !isLoginPage) {
      navigate("/login", { replace: true });
    }
  }, [isLoggedIn, isLoginPage, navigate]);

  if (!isLoggedIn && !isLoginPage) return null;

  return (
    <div className="relative flex min-h-screen bg-gray-100 dark:bg-gray-900">
      {!isLoginPage && (
        <div className="fixed top-0 left-0 z-50">
          <Sidebar />
        </div>
      )}

      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out 
          ${!isLoginPage ? "pl-24 sm:pl-28 md:pl-[300px]" : ""}`}
      >
        {!isLoginPage && <Header />}

        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/advertisers" element={<Advertisers />} />
            <Route path="/publishers" element={<Publishers />} />
            <Route path="/clicks" element={<Clicks />} />
            <Route path="/conversions" element={<Conversions />} />
            <Route path="/postbacks" element={<Postbacks />} />
            <Route path="/offers" element={<Offers />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/tracking" element={<PublisherTracking />} />
            <Route path="/api-docs" element={<ApiDocs />} />

            {/* FRAUD SYSTEM */}
            <Route path="/fraud-alerts" element={<FraudAlerts />} />
            <Route path="/fraud-analytics" element={<FraudAnalytics />} /> {/* ✅ NEW */}

            <Route path="/landing-builder" element={<LandingBuilder />} />
            <Route path="/traffic-distribution" element={<TrafficDistribution />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
