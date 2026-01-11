import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Advertisers from "./pages/Advertisers";
import Offers from "./pages/Offers";
import Publishers from "./pages/Publishers";
import PublisherDashboard from "./pages/PublisherDashboard";
import PublisherAssignOffers from "./pages/PublisherAssignOffers.jsx";
import DumpDashboard from "./pages/DumpDashboard";
import ProtectedRoute from "./auth/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes (ALL INSIDE ONE WRAPPER) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/advertisers" element={<Advertisers />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/publishers" element={<Publishers />} />
          <Route path="/publishers/assign" element={<PublisherAssignOffers />} />
          <Route path="/dashboard/dump" element={<DumpDashboard />} />
          <Route path="/publisher/dashboard" element={<PublisherDashboard />} />
        </Route>

        {/* Default & fallback */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
