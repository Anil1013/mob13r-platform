import { Navigate, Outlet } from "react-router-dom";
import { useEffect } from "react";

const IDLE_LIMIT = 15 * 60 * 1000; // 15 min

export default function ProtectedRoute() {
  const token = localStorage.getItem("token");
  const expiry = localStorage.getItem("token_expiry");

  // ✅ HARD FIX: expiry missing ko logout ka reason mat banao
  if (!token) {
    clearSession();
    return <Navigate to="/login" replace />;
  }

  // ⛔ expiry missing → allow session
  if (expiry && Date.now() > Number(expiry)) {
    clearSession();
    return <Navigate to="/login" replace />;
  }

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

    updateActivity();
    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);

    const timer = setInterval(checkIdle, 60000);

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      clearInterval(timer);
    };
  }, []);

  return <Outlet />;
}

function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("token_expiry");
  localStorage.removeItem("user");
}
