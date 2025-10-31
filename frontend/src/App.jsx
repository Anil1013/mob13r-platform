import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

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
import ApiDocs from "./pages/ApiDocs.jsx";
import FraudAlerts from "./pages/FraudAlerts.jsx";
import LandingBuilder from "./pages/LandingBuilder.jsx";
import Login from "./pages/Login.jsx";

function PrivateRoute({ children }) {
  const token = localStorage.getItem("mob13r_token");
  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  const location = useLocation();
  const isLogin = location.pathname === "/login";

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {!isLogin && <Sidebar />}

      <div className="flex-1 flex flex-col">
        {!isLogin && <Header />}

        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/advertisers" element={<PrivateRoute><Advertisers /></PrivateRoute>} />
            <Route path="/publishers" element={<PrivateRoute><Publishers /></PrivateRoute>} />
            <Route path="/clicks" element={<PrivateRoute><Clicks /></PrivateRoute>} />
            <Route path="/conversions" element={<PrivateRoute><Conversions /></PrivateRoute>} />
            <Route path="/postbacks" element={<PrivateRoute><Postbacks /></PrivateRoute>} />
            <Route path="/offers" element={<PrivateRoute><Offers /></PrivateRoute>} />
            <Route path="/api-docs" element={<PrivateRoute><ApiDocs /></PrivateRoute>} />
            <Route path="/fraud-alerts" element={<PrivateRoute><FraudAlerts /></PrivateRoute>} />
            <Route path="/landing-builder" element={<PrivateRoute><LandingBuilder /></PrivateRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
