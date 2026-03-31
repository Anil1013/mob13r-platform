import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Advertisers from "./pages/Advertisers";
import Offers from "./pages/Offers";
import Publishers from "./pages/Publishers";
import PublisherDashboard from "./pages/PublisherDashboard";
import PublisherAssignOffers from "./pages/PublisherAssignOffers.jsx";
import LandingBuilder from "./pages/LandingBuilder";
import DynamicLanding from "./pages/DynamicLanding";
import DumpDashboard from "./pages/DumpDashboard";
import ProtectedRoute from "./auth/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* 🔓 PUBLIC */}
        <Route path="/login" element={<Login />} />
        <Route path="/landing/:id" element={<DynamicLanding />} />

        {/* 🔐 PRIVATE */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/advertisers" element={<Advertisers />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/publishers" element={<Publishers />} />
          <Route path="/publishers/assign" element={<PublisherAssignOffers />} />
          <Route path="/landing-builder" element={<LandingBuilder />} />
          <Route path="/dashboard/dump" element={<DumpDashboard />} />
          <Route path="/publisher/dashboard" element={<PublisherDashboard />} />
        </Route>

        {/* Default */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
