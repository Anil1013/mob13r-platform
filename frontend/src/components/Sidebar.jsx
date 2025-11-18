import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  MousePointerClick,
  LineChart,
  Repeat,
  Building2,
  AlertTriangle,
  FileCode,
  Layers,
  Gift,
  Link2,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  const menu = [
    { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { name: "Advertisers", path: "/advertisers", icon: <Building2 size={18} /> },
    { name: "Offers", path: "/offers", icon: <Gift size={18} /> },
    { name: "Tracking", path: "/tracking", icon: <Link2 size={18} /> },
    { name: "Traffic Distribution", path: "/traffic-distribution", icon: <Shuffle size={18} /> },
    { name: "Templates", path: "/templates", icon: <FileCode size={18} /> },
    { name: "Publishers", path: "/publishers", icon: <Users size={18} /> },
    { name: "Clicks", path: "/clicks", icon: <MousePointerClick size={18} /> },
    { name: "Conversions", path: "/conversions", icon: <LineChart size={18} /> },
    { name: "Postbacks", path: "/postbacks", icon: <Repeat size={18} /> },
    { name: "Fraud Alerts", path: "/fraud-alerts", icon: <AlertTriangle size={18} /> },
    { name: "Landing Builder", path: "/landing-builder", icon: <Layers size={18} /> },
    { name: "API Docs", path: "/api-docs", icon: <FileCode size={18} /> },
  ];

  return (
    <aside
      className={`h-screen sticky top-0 z-30 bg-[#0c0f18]/80 backdrop-blur-xl border-r border-white/10 shadow-xl transition-all duration-300 flex flex-col ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <img
            src="/logo192.png"
            alt="logo"
            className="w-10 h-10 rounded-xl shadow-lg"
          />
          {!collapsed && (
            <span className="text-lg font-semibold tracking-wide text-white">
              Mob13r
            </span>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-white/10 transition"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {menu.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer border border-transparent
              ${
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                  : "text-gray-300 hover:bg-white/10 hover:border-white/10"
              }`
            }
          >
            <span className="text-white/90">{item.icon}</span>
            {!collapsed && <span>{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 text-xs text-gray-400 text-center">
        {!collapsed && `© ${new Date().getFullYear()} Mob13r Digital Media`}
      </div>
    </aside>
  );
}
