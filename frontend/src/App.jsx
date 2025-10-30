import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./components/Sidebar.jsx";
import Header from "./components/Header.jsx";
import ApiKeyPrompt from "./components/ApiKeyPrompt.jsx"; // ✅ added

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
import AdminKeys from "./pages/AdminKeys.jsx";

function App() {
  const [keyPresent, setKeyPresent] = useState(
    Boolean(localStorage.getItem("mob13r_api_key"))
  );

  // ✅ ask for API key before dashboard loads
  if (!keyPresent) {
    return <ApiKeyPrompt onSave={() => setKeyPresent(true)} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
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
            <Route path="/admin-keys" element={<AdminKeys />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
