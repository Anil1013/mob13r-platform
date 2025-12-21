import { Navigate, Outlet } from "react-router-dom";
import { useEffect } from "react";

const IDLE_LIMIT = 15 * 60 * 1000; // ⏱ 15 minutes

export default function ProtectedRoute() {
  const token = localStorage.getItem("token");

  // ❌ Token nahi → login
  if (!token) {
    clearSession();
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    // 🕒 Update last activity time
    const updateActivity = () => {
      localStorage.setItem("last_activity", Date.now());
    };

    // ⏱ Check idle timeout
    const checkIdle = () => {
      const lastActivity = Number(localStorage.getItem("last_activity"));

      if (!lastActivity) return;

      if (Date.now() - lastActivity >= IDLE_LIMIT) {
        clearSession();
        window.location.href = "/login";
      }
    };

    // First activity mark
    updateActivity();

    // User activity events
    const events = ["mousemove", "keydown", "scroll", "click"];
    events.forEach((event) =>
      window.addEventListener(event, updateActivity)
    );

    // Check idle every 30 seconds
    const interval = setInterval(checkIdle, 30 * 1000);

    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, updateActivity)
      );
      clearInterval(interval);
    };
  }, []);

  return <Outlet />;
}

function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("token_expiry");
  localStorage.removeItem("last_activity");
}
