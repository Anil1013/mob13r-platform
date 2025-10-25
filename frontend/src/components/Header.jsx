import React from "react";

export default function Header() {
  return (
    <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold text-gray-700">Dashboard</h2>
      <button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition">
        Logout
      </button>
    </header>
  );
}
