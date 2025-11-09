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
import Templates from "./pages/Templates.jsx"; // ✅ NEW IMPORT
import PublisherTracking from "./pages/PublisherTracking.jsx"; // ✅ NEW IMPORT
import TrafficDistribution from "./pages/Traffic-distribution.jsx";
import ApiDocs from "./pages/ApiDocs.jsx";
import FraudAlerts from "./pages/FraudAlerts.jsx";
import LandingBuilder from "./pages/LandingBuilder.jsx";
import Login from "./pages/Login.jsx";

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLoginPage = location.pathname === "/login";

  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("mob13r_token")
  );

  useEffect(() => {
    const checkToken = () => {
      const token = localStorage.getItem("mob13r_token");
      setIsLoggedIn(!!token);
    };
    checkToken();

    window.addEventListener("storage", checkToken);
    return () => window.removeEventListener("storage", checkToken);
  }, []);

  useEffect(() => {
    if (!isLoggedIn && !isLoginPage) {
      navigate("/login", { replace: true });
    }
  }, [isLoggedIn, isLoginPage, navigate]);

  // Prevent flicker while redirecting
  if (!isLoggedIn && !isLoginPage) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      {!isLoginPage && <Sidebar />}

      <div className="flex-1 flex flex-col">
        {!isLoginPage && <Header />}

        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={<Dashboard />} />
            <Route path="/advertisers" element={<Advertisers />} />
            <Route path="/publishers" element={<Publishers />} />
            <Route path="/clicks" element={<Clicks />} />
            <Route path="/conversions" element={<Conversions />} />
            <Route path="/postbacks" element={<Postbacks />} />
            <Route path="/offers" element={<Offers />} />
            <Route path="/templates" element={<Templates />} /> {/* ✅ NEW ROUTE */}
            <Route path="/tracking" element={<PublisherTracking />} /> {/* ✅ NEW ROUTE */}
            <Route path="/traffic-distribution" element={<TrafficDistribution />} />
            <Route path="/api-docs" element={<ApiDocs />} />
            <Route path="/fraud-alerts" element={<FraudAlerts />} />
            <Route path="/landing-builder" element={<LandingBuilder />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
