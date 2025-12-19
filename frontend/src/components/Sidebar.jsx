import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
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
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  User,
  FileBarChart,
} from "lucide-react";

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

      // ⭐ INAPP REPORT (ADDED)
      { label: "INAPP Report", icon: FileBarChart, to: "/inapp-report" },

      { label: "Postbacks", icon: Repeat, to: "/postbacks" },
      { label: "Fraud Alerts", icon: ShieldAlert, to: "/fraud-alerts" },
      { label: "Fraud Analytics", icon: AlertTriangle, to: "/fraud-analytics" },
      { label: "Traffic Distribution", icon: TrendingUp, to: "/traffic-distribution" },
      { label: "API Docs", icon: FileText, to: "/api-docs" },
    ],
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const initialWidth = Number(localStorage.getItem("sidebarWidth") || 280);

  const [collapsed, setCollapsed] = useState(initialWidth <= 85);
  const [width, setWidth] = useState(initialWidth);

  const [openSections, setOpenSections] = useState({
    overview: true,
    management: true,
    analytics: true,
  });

  const toggleSection = (key) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <aside
      style={{ width: collapsed ? 78 : width }}
      className="
        fixed top-4 left-4 h-[92vh] z-50
        rounded-3xl shadow-2xl border border-white/20
        bg-white/20 dark:bg-black/30
        backdrop-blur-2xl
        transition-all duration-300
        flex flex-col
      "
    >
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-white/20">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="logo" className="w-10 h-10 rounded-xl" />
          {!collapsed && (
            <div>
              <p className="font-bold text-lg dark:text-white text-gray-900">
                Mob13r
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Affiliate Suite
              </p>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-white/20 dark:hover:bg-white/10 rounded-lg transition"
        >
          {collapsed ? (
            <ChevronRight size={18} />
          ) : (
            <ChevronLeft size={18} />
          )}
        </button>
      </div>

      {/* Menu */}
      <div className="flex-1 overflow-y-auto px-3 py-4 customscroll">
        {MENU.map((section) => {
          const key = section.title.toLowerCase();
          const isOpen = openSections[key];

          return (
            <div key={key} className="mb-4">
              {!collapsed && (
                <div className="flex items-center justify-between px-2 mb-2">
                  <span className="text-[11px] font-semibold uppercase text-gray-600 dark:text-gray-400">
                    {section.title}
                  </span>

                  <button
                    onClick={() => toggleSection(key)}
                    className="p-1 hover:bg-white/10 rounded-md transition"
                  >
                    <ChevronDown
                      size={14}
                      className={`transition ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>
              )}

              <div
                className={`transition-all ${
                  isOpen ? "max-h-[800px]" : "max-h-0 overflow-hidden"
                }`}
              >
                {section.items.map((item) => (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    className={({ isActive }) =>
                      `
                      group flex items-center gap-3 px-3 py-2 mb-1 rounded-xl
                      transition-all duration-200
                      ${
                        isActive
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                          : "text-gray-800 dark:text-gray-200 hover:bg-white/20 dark:hover:bg-white/10"
                      }
                      `
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    {!collapsed && (
                      <span className="text-sm font-medium">{item.label}</span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Logout */}
      <div className="px-4 py-4 border-t border-white/20">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-white/40 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
            <User size={20} />
          </div>

          <button
            onClick={() => {
              localStorage.clear();
              navigate("/login");
            }}
            className={`${
              collapsed ? "w-12 h-12" : "w-full py-2"
            } bg-red-500 text-white rounded-xl hover:bg-red-600 transition`}
          >
            {collapsed ? <User size={18} /> : "Logout"}
          </button>
        </div>
      </div>
    </aside>
  );
}
