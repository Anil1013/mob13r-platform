import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  const expiry = localStorage.getItem("token_expiry");

  // ❌ No token or expired token
  if (!token || !expiry || Date.now() > Number(expiry)) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("token_expiry");
    return <Navigate to="/login" replace />;
  }

  return children;
}
