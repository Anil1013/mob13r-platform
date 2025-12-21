import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  const expiry = localStorage.getItem("token_expiry");

  // ❌ no token
  if (!token || !expiry) {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  // ❌ token expired
  if (Date.now() > Number(expiry)) {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  // ✅ token valid
  return children;
}
