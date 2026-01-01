import { BrowserRouter, Routes, Route } from "react-router-dom";

/* AUTH */
import Login from "./auth/Login";

/* ADMIN */
import Dashboard from "./pages/Dashboard";
import Advertisers from "./pages/Advertisers";
import Offers from "./pages/Offers";
import Publishers from "./pages/Publishers";
import PublisherAssignOffers from "./pages/PublisherAssignOffers";

/* PUBLISHER */
import PublisherDashboard from "./pages/PublisherDashboard";

/* GUARD */
import ProtectedRoute from "./auth/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* AUTH */}
        <Route path="/login" element={<Login />} />

        {/* ADMIN */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/advertisers" element={<Advertisers />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/publishers" element={<Publishers />} />
          <Route
            path="/publishers/assign"
            element={<PublisherAssignOffers />}
          />
        </Route>

        {/* PUBLISHER */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/publisher/dashboard"
            element={<PublisherDashboard />}
          />
        </Route>

        {/* DEFAULT */}
        <Route path="*" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}
