import React from "react";
import { NavLink } from "react-router-dom";

const menuItems = [
  { name: "Dashboard", path: "/" },
  { name: "Advertisers", path: "/advertisers" },
  { name: "Publishers", path: "/publishers" },
  { name: "Clicks", path: "/clicks" },
  { name: "Conversions", path: "/conversions" },
  { name: "Postbacks", path: "/postbacks" }
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r shadow-sm p-4 flex flex-col">
      <h2 className="text-xl font-bold mb-6 text-indigo-700">Mob13r Admin</h2>
      <nav className="flex flex-col gap-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `block px-4 py-2 rounded ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-gray-700 hover:bg-indigo-50"
              }`
            }
          >
            {item.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
