import { Navigate } from "react-router-dom";
import { useEffect } from "react";

const IDLE_LIMIT = 24 * 60 * 60 * 1000; // 24 hours

export default function ProtectedRoute({ children }) {
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

    updateActivity(); // ✅ ensure value exists

    ["mousemove", "keydown", "scroll", "click"].forEach((e) =>
      window.addEventListener(e, updateActivity)
    );

    return () => {
      ["mousemove", "keydown", "scroll", "click"].forEach((e) =>
        window.removeEventListener(e, updateActivity)
      );
    };
  }, []);

  // ✅ RENDER CHILD PAGE
  return children;
}

function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("token_expiry");
  localStorage.removeItem("last_activity");
}
