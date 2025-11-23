// File: frontend/src/components/Sidebar.jsx
// Ultra V6 Sidebar – Stable, Fast, No Errors

import React, { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Building2,
  Gift,
  FileText,
  Layers,
  TrendingUp,
  MousePointerClick,
  BarChart3,
  Repeat,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  User,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";

/* -------------------------------------------------
   MAIN MENU CONFIG
--------------------------------------------------- */
const MENU = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", icon: LayoutDashboard, to: "/" }],
  },
  {
    title: "Management",
    items: [
      { label: "Advertisers", icon: Building2, to: "/advertisers" },
      { label: "Publishers", icon: Users, to: "/publishers" },
      { label: "Offers", icon: Gift, to: "/offers" },
      { label: "Templates", icon: FileText, to: "/templates" },
      { label: "Landing Builder", icon: Layers, to: "/landing-builder" },
    ],
  },
  {
    title: "Analytics",
    items: [
      { label: "Tracking", icon: TrendingUp, to: "/tracking" },
      { label: "Clicks", icon: MousePointerClick, to: "/clicks" },
      { label: "Conversions", icon: BarChart3, to: "/conversions" },
      { label: "Postbacks", icon: Repeat, to: "/postbacks" },

      // FRAUD SECTION
      { label: "Fraud Alerts", icon: ShieldAlert, to: "/fraud-alerts" },
      { label: "Fraud Analytics", icon: BarChart3, to: "/fraud-analytics" }, // ⭐ Added
      { label: "Traffic Distribution", icon: TrendingUp, to: "/traffic-distribution" },
    ],
  },
];

const ACCENT_GRADIENT = "from-blue-500 to-indigo-600";

export default function Sidebar() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const dragRef = useRef(null);

  /* -------------------------------------------------
     Sidebar Width
  --------------------------------------------------- */
  const initialWidth = Number(localStorage.getItem("sidebarWidth") || 280);
  const [width, setWidth] = useState(initialWidth);
  const [collapsed, setCollapsed] = useState(initialWidth <= 80);
  const [hoverExpand, setHoverExpand] = useState(false);

  /* -------------------------------------------------
     Section Open States
  --------------------------------------------------- */
  const [openSections, setOpenSections] = useState({
    overview: true,
    management: true,
    analytics: true,
  });

  /* -------------------------------------------------
     Micro Stats
  --------------------------------------------------- */
  const [microStats, setMicroStats] = useState({
    clicks: 0,
    conv: 0,
    rev: 0,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("https://backend.mob13r.com/api/stats", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("mob13r_token")}`,
          },
        });

        if (!res.ok) throw new Error("Stats fetch error");

        const data = await res.json();

        setMicroStats({
          clicks: data.totalClicks || 0,
          conv: data.totalConversions || 0,
          rev: data.totalRevenue || 0,
        });
      } catch (err) {
        console.log("Sidebar stats error:", err.message);
      }
    }

    loadStats();
  }, []);

  /* -------------------------------------------------
     Sidebar Resize Drag Logic
  --------------------------------------------------- */
  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current) return;

      const startX = dragRef.current.startX;
      const startW = dragRef.current.startW;
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);

      let newWidth = Math.max(70, Math.min(520, startW + (clientX - startX)));
      setWidth(newWidth);
    };

    const stop = () => {
      dragRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", stop);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", stop);
    };

    function start(e) {
      dragRef.current = {
        startX: e.clientX || (e.touches && e.touches[0].clientX),
        startW: width,
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", stop);
      document.addEventListener("touchmove", onMove);
      document.addEventListener("touchend", stop);
    }

    const dragEl = containerRef.current?.querySelector(".drag-bar");
    if (dragEl) {
      dragEl.addEventListener("mousedown", start);
      dragEl.addEventListener("touchstart", start, { passive: true });
    }

    return () => {
      if (dragEl) {
        dragEl.removeEventListener("mousedown", start);
        dragEl.removeEventListener("touchstart", start);
      }
    };
  }, [width]);

  useEffect(() => {
    localStorage.setItem("sidebarWidth", width.toString());
    setCollapsed(width <= 80);
  }, [width]);

  /* -------------------------------------------------
     Section Toggle
  --------------------------------------------------- */
  const toggleSection = (key) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  /* -------------------------------------------------
     Render SIDEBAR
  --------------------------------------------------- */
  return (
    <aside
      ref={containerRef}
      style={{ width: collapsed && !hoverExpand ? 72 : width }}
      className="fixed top-4 left-4 h-[92vh] rounded-2xl shadow-2xl border border-white/10 bg-white/30 dark:bg-black/40 backdrop-blur-xl transition-all z-50"
      onMouseEnter={() => collapsed && setHoverExpand(true)}
      onMouseLeave={() => collapsed && setHoverExpand(false)}
    >
      {/* HEADER */}
      <div className="px-3 py-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" className="w-10 h-10 rounded-lg" alt="logo" />

          {!collapsed && (
            <div>
              <div className="font-bold text-lg dark:text-white text-gray-900">
                Mob13r
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Platform
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-white/10 rounded-md"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* MICRO STATS */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-white/10">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-white/10 rounded-lg">
              <div className="text-xs text-gray-400">Clicks</div>
              <div className="font-semibold dark:text-white">
                {microStats.clicks.toLocaleString()}
              </div>
            </div>
            <div className="p-2 bg-white/10 rounded-lg">
              <div className="text-xs text-gray-400">Conv</div>
              <div className="font-semibold dark:text-white">
                {microStats.conv.toLocaleString()}
              </div>
            </div>
            <div className="p-2 bg-white/10 rounded-lg">
              <div className="text-xs text-gray-400">Revenue</div>
              <div className="font-semibold dark:text-white">
                ₹{microStats.rev.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MENU */}
      <div className="px-2 py-3 h-[46vh] overflow-y-auto">
        {MENU.map((section) => {
          const key = section.title.toLowerCase();
          const isOpen = openSections[key];

          return (
            <div key={key} className="mb-4">
              {!collapsed && (
                <div className="flex items-center justify-between px-2 mb-2 text-xs uppercase text-gray-500 font-semibold">
                  <span>{section.title}</span>
                  <button
                    onClick={() => toggleSection(key)}
                    className="p-1 hover:bg-white/10 rounded-md"
                  >
                    <ChevronDown
                      size={14}
                      className={`transition-all ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>
              )}

              <div
                className={`transition-all duration-300 ${
                  isOpen ? "max-h-[600px]" : "max-h-0 overflow-hidden"
                }`}
              >
                {section.items.map((item) => (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 px-3 py-2 mb-1 rounded-lg transition-all 
                      ${
                        isActive
                          ? `bg-gradient-to-r ${ACCENT_GRADIENT} text-white`
                          : "text-gray-800 dark:text-gray-200 hover:bg-white/10"
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />

                    {!collapsed && (
                      <span className="text-sm font-medium">{item.label}</span>
                    )}

                    {collapsed && (
                      <span className="absolute left-20 bg-black text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none">
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* DRAG BAR */}
      <div className="drag-bar absolute right-0 top-0 bottom-0 w-2 cursor-col-resize" />

      {/* LOGOUT */}
      <div className="px-3 py-3 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/80 dark:bg-gray-800 flex items-center justify-center">
            <User size={18} className="text-gray-900 dark:text-white" />
          </div>

          {!collapsed && (
            <button
              onClick={() => {
                localStorage.clear();
                navigate("/login");
              }}
              className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
