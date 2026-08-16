import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Navbar";
import CpaSidebar from "./CpaSidebar";

// Wraps the existing Navbar (unchanged) + the new CPA sidebar.
// Used only by the new /cpa/* pages — every existing page/route is untouched.
export default function CpaLayout({ children }) {
  const navigate = useNavigate();
  const org = JSON.parse(localStorage.getItem("org")) || {};
  const hasCpaAccess = org.has_cpa_access !== false; // undefined/missing = enabled, backward-compatible with older sessions

  useEffect(() => {
    if (!hasCpaAccess) navigate("/dashboard", { replace: true });
  }, []);

  if (!hasCpaAccess) return null;

  return (
    <>
      <Navbar />
      <div style={{ display: "flex", background: "#fdf6f9", minHeight: "calc(100vh - 64px)" }}>
        <CpaSidebar />
        <div style={{ flex: 1, padding: "28px 24px", overflowX: "auto" }}>{children}</div>
      </div>
    </>
  );
}
