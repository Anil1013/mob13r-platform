import React from "react";
import { Bell, User } from "lucide-react";

function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white shadow-md border-b border-gray-200 sticky top-0 z-50">
      {/* Left: App Name / Logo */}
      <h1 className="text-2xl font-semibold text-gray-800 tracking-wide">
        Mob13r Dashboard
      </h1>

      {/* Right: Notification + User */}
      <div className="flex items-center gap-6">
        <button
          className="relative p-2 rounded-full hover:bg-gray-100 transition"
          title="Notifications"
        >
          <Bell size={20} className="text-gray-600" />
          <span className="absolute top-1 right-1 inline-flex h-2 w-2 bg-red-500 rounded-full"></span>
        </button>

        <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 px-3 py-1 rounded-lg transition">
          <User size={20} className="text-gray-700" />
          <span className="text-gray-800 font-medium text-sm">Admin</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
