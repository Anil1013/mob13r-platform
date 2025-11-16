import React from "react";
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
} from "lucide-react";

export default function Sidebar() {
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
      className="
        w-64 min-h-screen bg-gradient-to-b
        from-gray-900 via-gray-800 to-gray-900
        border-r border-white/10 shadow-xl
        flex flex-col
      "
    >
      {/* Logo Section */}
      <div className="flex items-center justify-center h-20 border-b border-white/10">
        <img
          src="/logo.png"
          alt="Mob13r Logo"
          className="w-20 h-auto drop-shadow-xl"
        />
      </div>

      {/* Menu */}
      <nav className="flex-1 mt-4 overflow-y-auto">
        <ul className="px-3 space-y-1">
          {menu.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `
                    flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium
                    transition-all duration-150 text-gray-300

                    ${
                      isActive
                        ? "bg-orange-500/20 text-orange-400 border border-orange-500/40 shadow-lg"
                        : "hover:bg-white/10 hover:text-white"
                    }
                  `
                }
              >
                {item.icon}
                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 text-xs text-gray-400 text-center">
        © {new Date().getFullYear()} Mob13r Digital Media
      </div>
    </aside>
  );
}
