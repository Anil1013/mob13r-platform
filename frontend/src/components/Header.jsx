import React, { useEffect, useState } from "react";
import { Bell, User, Sun, Moon } from "lucide-react";

function Header() {
  const [dark, setDark] = useState(
    localStorage.getItem("theme") === "dark" || false
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 shadow-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 transition-all">
      
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white tracking-wide">
        Mob13r Dashboard
      </h1>

      <div className="flex items-center gap-6">
        <button
          className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          title="Notifications"
        >
          <Bell size={20} className="text-gray-600 dark:text-gray-300" />
          <span className="absolute top-1 right-1 inline-flex h-2 w-2 bg-red-500 rounded-full"></span>
        </button>

        <button
          onClick={() => setDark(!dark)}
          className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:scale-110 transition"
          title="Toggle Theme"
        >
          {dark ? <Sun size={18} className="text-yellow-400"/> : <Moon size={18} className="text-gray-700" />}
        </button>

        <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1 rounded-lg transition">
          <User size={20} className="text-gray-700 dark:text-gray-300" />
          <span className="text-gray-800 dark:text-gray-200 font-medium text-sm">Admin</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
