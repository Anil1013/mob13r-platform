import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";

const IDLE_LIMIT = 60 * 60 * 1000; // 60 min

const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("token_expiry");
  localStorage.removeItem("last_activity");
};

export default function ProtectedRoute() {
  const location = useLocation();

  const token = localStorage.getItem("token");
  const expiry = localStorage.getItem("token_expiry");

  // ❌ no token or expired
  if (!token || !expiry || Date.now() > Number(expiry)) {
    clearSession();
    return <Navigate to="/login" replace />;
  }

  /* ✅ VERY IMPORTANT FIX */
  useEffect(() => {
    // 🔥 ROUTE CHANGE = ACTIVITY
    localStorage.setItem("last_activity", Date.now());
  }, [location.pathname]);

  useEffect(() => {
    const updateActivity = () => {
      localStorage.setItem("last_activity", Date.now());
    };

    const checkIdle = () => {
      const last = Number(localStorage.getItem("last_activity"));
      if (last && Date.now() - last >= IDLE_LIMIT) {
        clearSession();
        window.location.href = "/login";
      }
    };

    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);

    const interval = setInterval(checkIdle, 60 * 1000);

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      clearInterval(interval);
    };
  }, []);

  return <Outlet />;
}
