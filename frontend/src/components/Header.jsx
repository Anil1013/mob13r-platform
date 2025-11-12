import React, { useEffect, useState } from "react";
import { Bell, User, Sun, Moon, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Header() {
  const navigate = useNavigate();
  const [dark, setDark] = useState(
    localStorage.getItem("theme") === "dark" || false
  );

  // ✅ Get Admin Email from localStorage
  const adminData = JSON.parse(localStorage.getItem("mob13r_admin") || "{}");
  const adminEmail = adminData?.email || "Admin";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const handleLogout = () => {
    // ✅ Clear session and redirect
    localStorage.removeItem("mob13r_token");
    localStorage.removeItem("mob13r_admin");
    navigate("/login", { replace: true });
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 shadow-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 transition-all">
      {/* ✅ Dashboard Title */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white tracking-wide">
          Mob13r Dashboard
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Welcome, {adminEmail}
        </p>
      </div>

      {/* ✅ Right Icons Section */}
      <div className="flex items-center gap-6">
        {/* Notifications */}
        <button
          className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          title="Notifications"
        >
          <Bell size={20} className="text-gray-600 dark:text-gray-300" />
          <span className="absolute top-1 right-1 inline-flex h-2 w-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setDark(!dark)}
          className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:scale-110 transition"
          title="Toggle Theme"
        >
          {dark ? (
            <Sun size={18} className="text-yellow-400" />
          ) : (
            <Moon size={18} className="text-gray-700" />
          )}
        </button>

        {/* Admin Info */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">
          <User size={18} className="text-gray-700 dark:text-gray-300" />
          <span className="text-gray-800 dark:text-gray-200 text-sm font-medium">
            {adminEmail.split("@")[0]}
          </span>
        </div>

        {/* ✅ Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 transition"
          title="Logout"
        >
          <LogOut size={16} />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </header>
  );
}

export default Header;
