import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "../pages/Dashboard.jsx";
import Publishers from "../pages/Publishers.jsx";
import Advertisers from "../pages/Advertisers.jsx";
import Settings from "../pages/Settings.jsx";
import Login from "../pages/Login.jsx";
import Sidebar from "../components/Sidebar.jsx";
import Header from "../components/Header.jsx";

export default function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="p-6 flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/publishers" element={<Publishers />} />
              <Route path="/advertisers" element={<Advertisers />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/login" element={<Login />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
