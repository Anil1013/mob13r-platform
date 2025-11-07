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
} from "lucide-react";

function Sidebar() {
  const menuItems = [
    { name: "Dashboard", path: "/", icon: <LayoutDashboard size={18} /> },
    { name: "Advertisers", path: "/advertisers", icon: <Building2 size={18} /> },
    { name: "Publishers", path: "/publishers", icon: <Users size={18} /> },
    { name: "Clicks", path: "/clicks", icon: <MousePointerClick size={18} /> },
    { name: "Conversions", path: "/conversions", icon: <LineChart size={18} /> },
    { name: "Postbacks", path: "/postbacks", icon: <Repeat size={18} /> },
    { name: "Fraud Alerts", path: "/fraud-alerts", icon: <AlertTriangle size={18} /> },
    { name: "Landing Builder", path: "/landing-builder", icon: <Layers size={18} /> },
    { name: "API Docs", path: "/api-docs", icon: <FileCode size={18} /> },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 shadow-sm flex flex-col min-h-screen">
      {/* Logo Section */}
      <div className="flex items-center justify-center h-16 border-b border-gray-200 bg-gray-50">
        <h2 className="text-xl font-semibold text-blue-600 tracking-wide">
          Mob13r
        </h2>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto mt-4">
        <ul className="space-y-1 px-3">
          {menuItems.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-700 font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-blue-100 text-blue-600 shadow-sm"
                      : "hover:bg-blue-50 hover:text-blue-600"
                  }`
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
      <div className="p-4 border-t border-gray-200 text-xs text-gray-500 text-center bg-gray-50">
        © {new Date().getFullYear()} <span className="font-semibold">Mob13r Platform</span>
      </div>
    </aside>
  );
}

export default Sidebar;
