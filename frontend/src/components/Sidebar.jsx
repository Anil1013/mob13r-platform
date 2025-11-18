import React, { useState } from "react";
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
  Search,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const menuSections = [
  {
    title: "Overview",
    items: [{ name: "Dashboard", icon: LayoutDashboard, path: "/" }],
  },
  {
    title: "Management",
    items: [
      { name: "Advertisers", icon: Building2, path: "/advertisers" },
      { name: "Publishers", icon: Users, path: "/publishers" },
      { name: "Offers", icon: Gift, path: "/offers" },
      { name: "Templates", icon: FileText, path: "/templates" },
      { name: "Landing Builder", icon: Layers, path: "/landing-builder" },
    ],
  },
  {
    title: "Tracking & Analytics",
    items: [
      { name: "Tracking", icon: TrendingUp, path: "/tracking" },
      { name: "Clicks", icon: MousePointerClick, path: "/clicks" },
      { name: "Conversions", icon: BarChart3, path: "/conversions" },
      { name: "Postbacks", icon: Repeat, path: "/postbacks" },
      { name: "Fraud Alerts", icon: ShieldAlert, path: "/fraud-alerts" },
      { name: "Traffic Distribution", icon: TrendingUp, path: "/traffic-distribution" },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen z-50 transition-all duration-300
        border-r border-white/20 backdrop-blur-xl
        bg-white/30 dark:bg-gray-900/40 shadow-xl
        ${collapsed ? "w-20" : "w-72"}
      `}
    >
      {/* TOP AREA */}
      <div
        className="
          flex items-center justify-between px-4 py-4
          bg-white/40 dark:bg-gray-800/40 backdrop-blur-md
          border-b border-white/20
        "
      >
        {/* LOGO */}
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="logo" className="w-10 h-10" />

          {!collapsed && (
            <span className="text-xl font-extrabold text-gray-900 dark:text-white tracking-wide">
              Mob13r
            </span>
          )}
        </div>

        {/* COLLAPSE BUTTON */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-xl bg-white/30 dark:bg-gray-700/30 hover:bg-white/50 dark:hover:bg-gray-700/60 transition shadow-md"
        >
          {collapsed ? (
            <ChevronRight className="text-gray-700 dark:text-gray-200" />
          ) : (
            <ChevronLeft className="text-gray-700 dark:text-gray-200" />
          )}
        </button>
      </div>

      {/* SEARCH BAR */}
      {!collapsed && (
        <div className="px-4 py-3">
          <div
            className="
              flex items-center px-3 py-2 bg-white/40 dark:bg-gray-800/40
              backdrop-blur-md rounded-xl border border-white/20
            "
          >
            <Search className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            <input
              placeholder="Search menu..."
              className="ml-2 w-full bg-transparent outline-none text-gray-800 dark:text-gray-200 text-sm"
            />
          </div>
        </div>
      )}

      {/* MENU */}
      <nav className="mt-3 px-2 overflow-y-auto h-[78vh] scrollbar-thin">
        {menuSections.map((section, index) => (
          <div key={index} className="mb-6">
            {!collapsed && (
              <p className="px-3 mb-2 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400 tracking-widest opacity-70">
                {section.title}
              </p>
            )}

            {section.items.map((item, idx) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={idx}
                  to={item.path}
                  className={({ isActive }) =>
                    `
                    group relative flex items-center gap-3 px-3 py-3 rounded-xl mb-1
                    transition-all duration-200 cursor-pointer select-none

                    ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg scale-[1.02]"
                        : "text-gray-800 dark:text-gray-200 bg-white/20 dark:bg-gray-800/20 hover:bg-white/40 dark:hover:bg-gray-700/40"
                    }
                  `
                  }
                >
                  <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />

                  {!collapsed && (
                    <span className="font-medium text-sm">{item.name}</span>
                  )}

                  {/* Tooltip in collapsed mode */}
                  {collapsed && (
                    <span
                      className="
                        absolute left-20 bg-black text-white text-xs
                        px-3 py-1 rounded-md opacity-0 group-hover:opacity-100
                        whitespace-nowrap transition pointer-events-none
                      "
                    >
                      {item.name}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* FOOTER LABEL */}
      {!collapsed && (
        <div className="py-4 text-center text-sm text-gray-600 dark:text-gray-400 opacity-70">
          © 2025 Mob13r Digital Media
        </div>
      )}
    </aside>
  );
}
