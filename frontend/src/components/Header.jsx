import React, { useEffect, useState } from "react";
import { Bell, User, Sun, Moon, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Header() {
  const navigate = useNavigate();
  const [dark, setDark] = useState(
    localStorage.getItem("theme") === "dark" || false
  );

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
    <header className="flex items-center justify-between px-6 py-4 
      bg-white/10 dark:bg-gray-900/80 backdrop-blur-lg 
      shadow-lg border-b border-white/20 sticky top-0 z-50 transition-all">

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

      {/* RIGHT SIDE ICONS */}
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

        {/* Admin Profile */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/20">
          <User size={18} className="text-white" />
          <span className="text-white font-medium text-sm">
            {adminEmail.split("@")[0]}
          </span>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition"
        >
          <LogOut size={16} />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </header>
  );
}

export default Header;
