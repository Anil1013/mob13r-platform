import { HashRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Advertisers from "./pages/Advertisers";
import Offers from "./pages/Offers";
import OfferExecute from "./pages/OfferExecute";
import OfferExecutionLogs from "./pages/OfferExecutionLogs";

import ProtectedRoute from "./auth/ProtectedRoute";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* PUBLIC */}
        <Route path="/login" element={<Login />} />

        {/* PROTECTED */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/advertisers"
          element={
            <ProtectedRoute>
              <Advertisers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/offers"
          element={
            <ProtectedRoute>
              <Offers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/offers/:id/execute"
          element={
            <ProtectedRoute>
              <OfferExecute />
            </ProtectedRoute>
          }
        />

        {/* EXECUTION LOGS */}
        <Route
          path="/execution-logs"
          element={
            <ProtectedRoute>
              <OfferExecutionLogs />
            </ProtectedRoute>
          }
        />

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  );
}
