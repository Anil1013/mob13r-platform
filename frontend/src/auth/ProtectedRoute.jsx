import { Navigate } from "react-router-dom";

/**
 * 🔐 JWT Protected Route
 * - localStorage se token check
 * - token nahi → /login
 * - token hai → page allow
 */
export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  // ❌ Token nahi hai
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Token hai
  return children;
}

/**
 * 🚪 Logout helper (optional use)
 */
export const logout = () => {
  localStorage.removeItem("token");
  window.location.href = "/login";
};
