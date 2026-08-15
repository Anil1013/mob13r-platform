import Navbar from "../Navbar";
import CpaSidebar from "./CpaSidebar";

// Wraps the existing Navbar (unchanged) + the new CPA sidebar.
// Used only by the new /cpa/* pages — every existing page/route is untouched.
export default function CpaLayout({ children }) {
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
