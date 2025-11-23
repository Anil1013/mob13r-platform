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
  AlertTriangle,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";

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
      { label: "Fraud Alerts", icon: ShieldAlert, to: "/fraud-alerts" },

      // ✅ NEW FRAUD ANALYTICS ENTRY
      { label: "Fraud Analytics", icon: AlertTriangle, to: "/fraud-analytics" },

      { label: "Traffic Distribution", icon: TrendingUp, to: "/traffic-distribution" },
    ],
  },
];

const ACCENT_GRADIENT = "from-blue-500 to-indigo-600";

export default function Sidebar() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const dragRef = useRef(null);

  const initialWidth = Number(localStorage.getItem("sidebarWidth") || 280);
  const [width, setWidth] = useState(initialWidth);
  const [collapsed, setCollapsed] = useState(initialWidth <= 80);
  const [openSections, setOpenSections] = useState({
    overview: true,
    management: true,
    analytics: true,
  });

  const toggleSection = (key) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <aside
      ref={containerRef}
      style={{ width: collapsed ? 72 : width }}
      className="fixed top-4 left-4 h-[92vh] z-50 rounded-2xl shadow-2xl border border-white/10 bg-white/30 dark:bg-black/40 backdrop-blur-xl transition-all flex flex-col"
    >
      {/* HEADER */}
      <div className="px-3 py-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="logo" className="w-10 h-10 rounded-lg" />
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

      {/* MENU SCROLLABLE */}
      <div className="flex-1 overflow-y-auto px-2 py-4">
        {MENU.map((section) => {
          const key = section.title.toLowerCase();
          const isOpen = openSections[key];

          return (
            <div key={key} className="mb-4">
              {!collapsed && (
                <div className="flex items-center justify-between px-2 mb-2 text-xs uppercase text-gray-500 font-semibold">
                  {section.title}

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
                      <span className="text-sm font-medium">
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

      {/* FIXED BOTTOM LOGOUT */}
      <div className="px-3 pb-4">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-white/80 dark:bg-gray-800 flex items-center justify-center mb-3">
            <User size={20} className="text-gray-900 dark:text-white" />
          </div>

          <button
            onClick={() => {
              localStorage.clear();
              navigate("/login");
            }}
            className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 text-center"
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
