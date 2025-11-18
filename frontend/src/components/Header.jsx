// File: frontend/src/components/Header.jsx

import React, { useEffect, useState } from "react";
import { Bell, User, Sun, Moon, LogOut, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Header() {
  const navigate = useNavigate();

  const [dark, setDark] = useState(
    localStorage.getItem("theme") === "dark" || false
  );

  const [menuOpen, setMenuOpen] = useState(false);

  // Get logged-in admin email
  const adminData = JSON.parse(localStorage.getItem("mob13r_admin") || "{}");
  const adminEmail = adminData?.email || "Admin";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const handleLogout = () => {
    localStorage.removeItem("mob13r_token");
    localStorage.removeItem("mob13r_admin");
    navigate("/login", { replace: true });
  };

  return (
    <header
      className="flex items-center justify-between px-6 py-4 
      bg-white/10 dark:bg-gray-900/80 backdrop-blur-lg 
      shadow-lg border-b border-white/20 sticky top-0 z-50"
    >
      {/* LOGO + TITLE */}
      <div className="flex items-center gap-3">
        <img
          src="/logo.png"
          alt="Mob13r Logo"
          className="w-12 h-12 drop-shadow-xl"
        />
        <div>
          <h1 className="text-xl font-semibold text-white tracking-wide">
            Mob13r Dashboard
          </h1>
          <p className="text-sm text-gray-300">Welcome, {adminEmail}</p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-6">

        {/* Notifications */}
        <button className="relative p-2 rounded-full hover:bg-white/10 transition">
          <Bell size={20} className="text-white" />
          <span className="absolute top-1 right-1 inline-flex h-2 w-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setDark(!dark)}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition"
        >
          {dark ? (
            <Sun size={20} className="text-yellow-400" />
          ) : (
            <Moon size={20} className="text-white" />
          )}
        </button>

        {/* PROFILE DROPDOWN */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg 
            bg-white/20 hover:bg-white/30 transition"
          >
            <User size={18} className="text-white" />
            <span className="text-white font-medium text-sm">
              {adminEmail.split("@")[0]}
            </span>
            <ChevronDown
              size={18}
              className={`text-white transition-transform ${
                menuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* DROPDOWN MENU */}
          {menuOpen && (
            <div
              className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 
              shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 
              overflow-hidden animate-fadeIn"
            >
              <button
                className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 
                dark:hover:bg-gray-700 transition"
                onClick={() => navigate("/profile")}
              >
                My Profile
              </button>

              <button
                className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 
                dark:hover:bg-gray-700 transition"
                onClick={() => navigate("/settings")}
              >
                Settings
              </button>

              <button
                className="w-full text-left px-4 py-3 text-sm text-red-600 
                hover:bg-red-50 dark:hover:bg-red-900 transition flex items-center gap-2"
                onClick={handleLogout}
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
