import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Users, Briefcase, Settings } from "lucide-react";

export default function Sidebar() {
  const menuItems = [
    { name: "Dashboard", icon: <Home size={18} />, path: "/dashboard" },
    { name: "Publishers", icon: <Users size={18} />, path: "/publishers" },
    { name: "Advertisers", icon: <Briefcase size={18} />, path: "/advertisers" },
    { name: "Settings", icon: <Settings size={18} />, path: "/settings" },
  ];

  return (
    <aside className="w-64 bg-gray-900 text-gray-200 flex flex-col">
      <div className="px-6 py-4 text-xl font-semibold border-b border-gray-700">
        Mob13r
      </div>
      <nav className="flex-1 mt-4">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 hover:bg-gray-800 transition ${
                isActive ? "bg-gray-800 text-white" : ""
              }`
            }
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
