import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Advertisers from "./pages/Advertisers";
import Offers from "./pages/Offers";

import ProtectedRoute from "./auth/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* 🔓 Public */}
        <Route path="/login" element={<Login />} />

        {/* 🔐 ALL PROTECTED ROUTES */}
        <Route
          element={
            <ProtectedRoute>
              {/* 👇 all protected pages live here */}
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/advertisers" element={<Advertisers />} />
                <Route path="/offers" element={<Offers />} />
              </Routes>
            </ProtectedRoute>
          }
        />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
