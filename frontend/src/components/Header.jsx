import React from "react";

export default function Header() {
  return (
    <header className="bg-white shadow-sm px-6 py-3 flex justify-between items-center">
      <h1 className="text-lg font-semibold text-gray-700">Mob13r Dashboard</h1>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Welcome, Admin</span>
        <button className="bg-indigo-600 text-white px-3 py-1 rounded text-sm">
          Logout
        </button>
      </div>
    </header>
  );
}
