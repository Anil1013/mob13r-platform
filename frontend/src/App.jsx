import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Sidebar from "./components/Sidebar.jsx";
import Header from "./components/Header.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import Advertisers from "./pages/Advertisers.jsx";
import Publishers from "./pages/Publishers.jsx";
import Clicks from "./pages/Clicks.jsx";
import Conversions from "./pages/Conversions.jsx";
import Postbacks from "./pages/Postbacks.jsx";
import Offers from "./pages/Offers.jsx";
import ApiDocs from "./pages/ApiDocs.jsx";
import FraudAlerts from "./pages/FraudAlerts.jsx";
import LandingBuilder from "./pages/LandingBuilder.jsx";
import Login from "./pages/Login.jsx";

function App() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  const isLoggedIn = !!localStorage.getItem("mob13r_token");


  // ✅ If not logged in & not on /login → redirect
  if (!isLoggedIn && !isLoginPage) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* ❌ Hide Sidebar & Header on login page */}
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
            <Route path="/api-docs" element={<ApiDocs />} />
            <Route path="/fraud-alerts" element={<FraudAlerts />} />
            <Route path="/landing-builder" element={<LandingBuilder />} />

            {/* Default */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
