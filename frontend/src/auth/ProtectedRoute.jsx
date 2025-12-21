import { Navigate, Outlet } from "react-router-dom";
import { useEffect } from "react";

const IDLE_LIMIT = 15 * 60 * 1000; // 15 minutes

export default function ProtectedRoute() {
  const token = localStorage.getItem("token");
  const expiry = localStorage.getItem("token_expiry");

  // ❌ No token or expired
  if (!token || !expiry || Date.now() > Number(expiry)) {
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
        window.location.replace("/#/login");
      }
    };

    updateActivity();
    ["mousemove", "keydown", "scroll", "click"].forEach(e =>
      window.addEventListener(e, updateActivity)
    );

    const interval = setInterval(checkIdle, 30 * 1000);

    return () => {
      ["mousemove", "keydown", "scroll", "click"].forEach(e =>
        window.removeEventListener(e, updateActivity)
      );
      clearInterval(interval);
    };
  }, []);

  return <Outlet />;
}

function clearSession() {
  localStorage.clear();
}
