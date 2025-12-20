import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Advertisers from "./pages/Advertisers";
import Offers from "./pages/Offers";

/* 🔹 Offer Internal Screens */
import OfferForm from "./pages/OfferForm";
import OfferConfig from "./pages/OfferConfig";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<Login />} />

        {/* Main Pages */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/advertisers" element={<Advertisers />} />
        <Route path="/offers" element={<Offers />} />

        {/* Offer Flow (NO sidebar links needed) */}
        <Route path="/offers/new" element={<OfferForm />} />
        <Route path="/offers/:id/edit" element={<OfferForm />} />
        <Route path="/offers/:id/config" element={<OfferConfig />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}
