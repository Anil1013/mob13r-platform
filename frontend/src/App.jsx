import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import Header from "./components/Header.jsx";

// Pages
import Dashboard from "./pages/Dashboard.jsx";
import Advertisers from "./pages/Advertisers.jsx";
import Publishers from "./pages/Publishers.jsx";
import Clicks from "./pages/Clicks.jsx";
import Conversions from "./pages/Conversions.jsx";
import Postbacks from "./pages/Postbacks.jsx";

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-gray-50 text-gray-900">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
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

              {/* Redirect unknown routes to Dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
