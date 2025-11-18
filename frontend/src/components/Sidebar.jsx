import React, { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Building2,
  Gift,
  FileText,
  Layers,
  TrendingUp,
  MousePointerClick,
  BarChart3,
  Repeat,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  User,
  LogOut,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState({
    overview: true,
    management: true,
    analytics: true,
  });

  const toggleSection = (key) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const admin = JSON.parse(localStorage.getItem("mob13r_admin") || "{}");

  const menu = {
    overview: [
      { label: "Dashboard", icon: LayoutDashboard, to: "/" },
    ],
    management: [
      { label: "Advertisers", icon: Building2, to: "/advertisers" },
      { label: "Publishers", icon: Users, to: "/publishers" },
      { label: "Offers", icon: Gift, to: "/offers" },
      { label: "Templates", icon: FileText, to: "/templates" },
      { label: "Landing Builder", icon: Layers, to: "/landing-builder" },
    ],
    analytics: [
      { label: "Tracking", icon: TrendingUp, to: "/tracking" },
      { label: "Clicks", icon: MousePointerClick, to: "/clicks" },
      { label: "Conversions", icon: BarChart3, to: "/conversions" },
      { label: "Postbacks", icon: Repeat, to: "/postbacks" },
      { label: "Fraud Alerts", icon: ShieldAlert, to: "/fraud-alerts" },
      { label: "Traffic Distribution", icon: TrendingUp, to: "/traffic-distribution" },
    ],
  };

  return (
    <aside
      className={`
        fixed top-4 left-4 h-[96vh] rounded-3xl shadow-2xl z-50
        border border-white/20 backdrop-blur-3xl
        bg-white/20 dark:bg-gray-900/30
        transition-all duration-500 ease-in-out
        ${collapsed ? "w-20" : "w-80"}
      `}
    >

      {/* TOP BAR */}
      <div
        className="
          flex items-center justify-between px-4 py-4
          border-b border-white/20
        "
      >
        <div className="flex items-center gap-3">
          <img src="/logo.png" className="w-10 h-10" alt="logo" />
          {!collapsed && (
            <span className="font-bold text-lg text-gray-900 dark:text-white">
              Mob13r
            </span>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-xl bg-white/30 dark:bg-gray-700/40 hover:bg-white/50 dark:hover:bg-gray-700/60 transition"
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
      </div>

      {/* SEARCH */}
      {!collapsed && (
        <div className="px-4 py-3">
          <div
            className="
              flex items-center bg-white/30 dark:bg-gray-700/30
              px-3 py-2 rounded-xl backdrop-blur-sm border border-white/20
            "
          >
            <Search size={16} />
            <input
              placeholder="Search menu..."
              className="ml-2 w-full bg-transparent outline-none text-sm"
            />
          </div>
        </div>
      )}

      {/* MENU */}
      <div className="px-3 mt-3 h-[62vh] overflow-y-auto scrollbar-thin">

        {/* SECTION BUILDER */}
        {Object.entries(menu).map(([section, items]) => {
          const isOpen = openSections[section];

          return (
            <div key={section} className="mb-6">

              {/* Section Header */}
              <button
                onClick={() => toggleSection(section)}
                className={`
                  flex items-center justify-between w-full px-3 py-2
                  text-xs uppercase tracking-wider font-bold
                  text-gray-600 dark:text-gray-400
                  ${collapsed ? "hidden" : ""}
                `}
              >
                {section.replace(/^\w/, (c) => c.toUpperCase())}
                <ChevronDown
                  className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Items */}
              <div
                className={`
                  transition-all duration-300
                  ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0 overflow-hidden"}
                `}
              >
                {items.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={index}
                      to={item.to}
                      className={({ isActive }) =>
                        `
                        group flex items-center gap-3 my-1 px-3 py-3 rounded-xl
                        transition-all duration-300 cursor-pointer

                        ${
                          isActive
                            ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md scale-[1.03]"
                            : "bg-white/10 dark:bg-gray-800/20 text-gray-800 dark:text-gray-200 hover:bg-white/20 dark:hover:bg-gray-700/30"
                        }
                      `
                      }
                    >
                      <Icon className="w-5 h-5" />
                      {!collapsed && <span className="font-medium">{item.label}</span>}

                      {/* Tooltip for collapsed */}
                      {collapsed && (
                        <span
                          className="
                            absolute left-20 bg-black text-white text-xs
                            px-3 py-1 rounded-md opacity-0 group-hover:opacity-100
                            whitespace-nowrap transition
                          "
                        >
                          {item.label}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* BOTTOM PROFILE CARD */}
      <div
        className={`
          absolute bottom-4 left-0 right-0 mx-4 rounded-2xl p-4
          bg-white/30 dark:bg-gray-800/40 border border-white/20
          backdrop-blur-xl shadow-xl transition-all duration-300
          ${collapsed ? "opacity-0 pointer-events-none" : "opacity-100"}
        `}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/60 dark:bg-gray-700 flex items-center justify-center shadow">
            <User className="text-gray-900 dark:text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {admin?.email?.split("@")[0] || "Admin"}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Online</p>
          </div>
        </div>

        <button
          onClick={() => {
            localStorage.clear();
            navigate("/login");
          }}
          className="
            mt-3 w-full flex items-center justify-center gap-2 px-3 py-2
            rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm transition
          "
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
