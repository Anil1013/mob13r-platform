import React, { useEffect, useState, useRef } from "react";
import { Bell, User, Sun, Moon, LogOut, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Header() {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const [dark, setDark] = useState(
    localStorage.getItem("theme") === "dark" || false
  );

  const [openDropdown, setOpenDropdown] = useState(false);

  const adminData = JSON.parse(localStorage.getItem("mob13r_admin") || "{}");
  const adminEmail = adminData?.email || "Admin";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  // Auto-close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("mob13r_token");
    localStorage.removeItem("mob13r_admin");
    navigate("/login", { replace: true });
  };

  return (
    <header
      className="
        flex items-center justify-between 
        px-6 py-4
        bg-white/70 dark:bg-[#0f111a]/80 
        backdrop-blur-xl
        shadow-md border-b border-gray-300/40 dark:border-gray-700/40
        sticky top-0 z-50 transition-all
      "
    >
      {/* LEFT */}
      <div className="flex items-center gap-4">
        <img
          src="/logo.png"
          alt="Mob13r Logo"
          className="w-10 h-10 object-contain rounded-md shadow-sm"
        />
        <div className="leading-tight">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Mob13r Dashboard
          </h1>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Welcome, {adminEmail}
          </p>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-5">

        {/* Notifications */}
        <button className="relative p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-800/60 transition">
          <Bell size={20} className="text-gray-700 dark:text-gray-200" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setDark(!dark)}
          className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        >
          {dark ? (
            <Sun size={20} className="text-yellow-400" />
          ) : (
            <Moon size={20} className="text-gray-700" />
          )}
        </button>

        {/* DROPDOWN MENU */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpenDropdown(!openDropdown)}
            className="
              flex items-center gap-2 
              px-3 py-1 rounded-full 
              bg-gray-100 dark:bg-gray-800 
              hover:bg-gray-200 dark:hover:bg-gray-700 
              transition
            "
          >
            <User size={18} className="text-gray-700 dark:text-gray-300" />
            <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">
              {adminEmail.split("@")[0]}
            </span>
            <ChevronDown
              size={16}
              className={`transition-transform text-gray-600 dark:text-gray-300 ${
                openDropdown ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* DROPDOWN PANEL */}
          {openDropdown && (
            <div
              className="
                absolute right-0 mt-2 w-48 
                bg-white dark:bg-gray-900 
                shadow-xl rounded-lg border border-gray-200 dark:border-gray-700
                animate-dropdown
                overflow-hidden
              "
            >
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                  {adminEmail}
                </p>
              </div>

              <button
                onClick={() => navigate("/profile")}
                className="
                  w-full text-left px-4 py-2 
                  text-sm text-gray-700 dark:text-gray-300 
                  hover:bg-gray-100 dark:hover:bg-gray-800 transition
                "
              >
                Profile Settings
              </button>

              <button
                onClick={() => navigate("/notifications")}
                className="
                  w-full text-left px-4 py-2 
                  text-sm text-gray-700 dark:text-gray-300 
                  hover:bg-gray-100 dark:hover:bg-gray-800 transition
                "
              >
                Notifications
              </button>

              <button
                onClick={handleLogout}
                className="
                  w-full text-left px-4 py-2 
                  text-sm text-red-600 dark:text-red-400 
                  hover:bg-red-50 dark:hover:bg-red-900/40 transition
                  font-semibold
                "
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
