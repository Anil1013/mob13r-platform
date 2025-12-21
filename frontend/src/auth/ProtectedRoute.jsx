import { Navigate, Outlet } from "react-router-dom";

const TOKEN_DURATION = 20 * 60 * 1000; // ⏱ 20 minutes

export default function ProtectedRoute() {
  const token = localStorage.getItem("token");
  const expiry = localStorage.getItem("token_expiry");

  // ❌ Token missing
  if (!token || !expiry) {
    clearSession();
    return <Navigate to="/login" replace />;
  }

  // ⏱ Expired?
  const now = Date.now();
  if (now > Number(expiry)) {
    clearSession();
    return <Navigate to="/login" replace />;
  }

  // ✅ Token valid
  return <Outlet />;
}

function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("token_expiry");
}
