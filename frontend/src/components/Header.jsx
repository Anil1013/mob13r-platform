import React, { useState, useEffect, useRef } from "react";
import {
  Bell,
  User,
  Sun,
  Moon,
  LogOut,
  Settings,
  ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Header() {
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

  // Close dropdown on outside click
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
    <header
      className="
        sticky top-0 z-40 w-full
        px-6 py-4 flex items-center justify-between
        bg-white/40 dark:bg-black/30
        backdrop-blur-xl
        border-b border-white/20 dark:border-white/10
        shadow-[0_4px_20px_-3px_rgba(0,0,0,0.07)]
      "
    >
      {/* LEFT — Logo + Title */}
      <div className="flex items-center gap-4">
        <img
          src="/logo.png"
          alt="logo"
          className="w-12 h-12 rounded-xl shadow-md shadow-black/10"
        />

        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
            Mob13r Dashboard
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Welcome, {adminEmail}
          </p>
        </div>
      </div>

      {/* RIGHT — Icons */}
      <div className="flex items-center gap-5">

        {/* Notifications */}
        <button
          className="
            relative p-2 rounded-xl 
            hover:bg-white/30 dark:hover:bg-white/10 
            transition shadow-sm
          "
        >
          <Bell size={20} className="text-gray-800 dark:text-gray-200" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-600 rounded-full shadow" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setDark(!dark)}
          className="
            p-2 rounded-xl 
            hover:bg-white/30 dark:hover:bg-white/10 
            transition shadow-sm
          "
        >
          {dark ? (
            <Sun size={20} className="text-yellow-300" />
          ) : (
            <Moon size={20} className="text-gray-700 dark:text-gray-200" />
          )}
        </button>

        {/* PROFILE DROPDOWN */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen(!open)}
            className="
              flex items-center gap-2 px-4 py-2 
              bg-white/30 dark:bg-white/10
              rounded-xl shadow-sm 
              hover:bg-white/40 dark:hover:bg-white/20
              transition backdrop-blur-sm
            "
          >
            <User size={18} className="text-gray-900 dark:text-gray-200" />
            <span className="text-gray-800 dark:text-gray-200 text-sm font-medium">
              {adminEmail.split('@')[0]}
            </span>
            <ChevronDown size={16} className="text-gray-600 dark:text-gray-300" />
          </button>

          {open && (
            <div
              className="
                absolute right-0 mt-3 w-48 
                bg-white/50 dark:bg-black/30 
                backdrop-blur-xl
                border border-white/20 
                shadow-lg rounded-xl overflow-hidden
                animate-fadeIn
              "
            >
              <button className="flex w-full items-center gap-2 px-4 py-3 
                                 hover:bg-black/5 dark:hover:bg-white/10 
                                 text-gray-700 dark:text-gray-200 text-sm">
                <User size={16} /> My Profile
              </button>

              <button className="flex w-full items-center gap-2 px-4 py-3 
                                 hover:bg-black/5 dark:hover:bg-white/10 
                                 text-gray-700 dark:text-gray-200 text-sm">
                <Settings size={16} /> Settings
              </button>

              <hr className="border-white/20" />

              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-3 
                           text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20
                           text-sm font-medium"
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
