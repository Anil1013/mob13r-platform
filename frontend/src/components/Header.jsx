import React, { useState, useEffect, useRef } from "react";
import { Bell, User, Sun, Moon, LogOut, Settings, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Header() {
  const navigate = useNavigate();
  const [dark, setDark] = useState(localStorage.getItem("theme") === "dark");
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const adminData = JSON.parse(localStorage.getItem("mob13r_admin") || "{}");
  const adminEmail = adminData?.email || "admin";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("mob13r_token");
    localStorage.removeItem("mob13r_admin");
    navigate("/login", { replace: true });
  };

  return (
    <header className="flex items-center justify-between px-6 py-4
      bg-white dark:bg-gray-900 shadow-md border-b border-gray-200 dark:border-gray-800
      sticky top-0 z-50 backdrop-blur-md">

      {/* LEFT SIDE – LOGO + TITLE */}
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="logo" className="w-12 h-12" />

        <div>
          <h1 className="text-xl font-semibold dark:text-white text-gray-900">
            Mob13r Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Welcome, {adminEmail}
          </p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-5">

        {/* Notifications */}
        <button className="relative p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition">
          <Bell size={20} className="text-gray-700 dark:text-gray-200" />
          <span className="absolute top-1 right-1 inline-flex h-2 w-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setDark(!dark)}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition"
        >
          {dark ? (
            <Sun size={20} className="text-yellow-400" />
          ) : (
            <Moon size={20} className="text-gray-700 dark:text-gray-200" />
          )}
        </button>

        {/* PROFILE DROPDOWN */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800
                       rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            <User size={18} className="text-gray-700 dark:text-gray-200" />
            <span className="text-gray-700 dark:text-gray-200 font-medium text-sm">
              {adminEmail.split("@")[0]}
            </span>
            <ChevronDown size={16} className="text-gray-600 dark:text-gray-300" />
          </button>

          {/* DROPDOWN MENU */}
          {open && (
            <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-900
                            border border-gray-200 dark:border-gray-700
                            shadow-lg rounded-lg py-2 animate-fadeIn">

              <button className="flex w-full items-center gap-2 px-4 py-2 
                                 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
                <User size={16} /> My Profile
              </button>

              <button className="flex w-full items-center gap-2 px-4 py-2 
                                 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
                <Settings size={16} /> Settings
              </button>

              <hr className="my-2 border-gray-200 dark:border-gray-700" />

              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-red-500 
                           hover:bg-red-50 dark:hover:bg-red-900/20"
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
