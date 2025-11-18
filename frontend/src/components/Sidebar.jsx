import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, MousePointerClick, LineChart, Repeat,
  Building2, AlertTriangle, FileCode, Layers, Gift, Link2, Shuffle
} from "lucide-react";

function Sidebar() {
  const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { name: "Advertisers", path: "/advertisers", icon: <Building2 size={18} /> },
    { name: "Publishers", path: "/publishers", icon: <Users size={18} /> },
    { name: "Offers", path: "/offers", icon: <Gift size={18} /> },
    { name: "Templates", path: "/templates", icon: <FileCode size={18} /> },
    { name: "Landing Builder", path: "/landing-builder", icon: <Layers size={18} /> },
    { name: "Tracking", path: "/tracking", icon: <Link2 size={18} /> },
    { name: "Clicks", path: "/clicks", icon: <MousePointerClick size={18} /> },
    { name: "Conversions", path: "/conversions", icon: <LineChart size={18} /> },
    { name: "Postbacks", path: "/postbacks", icon: <Repeat size={18} /> },
    { name: "Fraud Alerts", path: "/fraud-alerts", icon: <AlertTriangle size={18} /> },
    { name: "Traffic Distribution", path: "/traffic-distribution", icon: <Shuffle size={18} /> },
    { name: "API Docs", path: "/api-docs", icon: <FileCode size={18} /> },
  ];

  return (
    <aside className="w-64 bg-[#1d1f27] dark:bg-[#141621] text-white shadow-xl flex flex-col">
      
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
        <img
          src="/logo.png"
          alt="Mob13r Logo"
          className="w-10 h-10 rounded-md object-contain"
        />
        <span className="text-xl font-semibold tracking-wide">Mob13r</span>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-all ${
                isActive
                  ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg"
                  : "text-gray-300 hover:bg-gray-700/40"
              }`
            }
          >
            {item.icon}
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 text-xs text-gray-400 border-t border-white/10">
        © {new Date().getFullYear()} Mob13r Digital Media
      </div>

    </aside>
  );
}

export default Sidebar;
