import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  MousePointerClick,
  LineChart,
  Repeat,
  Building2,
  AlertTriangle,
  FileCode,
  Layers,
  Gift,
  Link2,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Search,
  Menu,
  X,
} from "lucide-react";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");

  const groupedMenu = {
    "Overview": [
      { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
    ],
    "Management": [
      { label: "Advertisers", path: "/advertisers", icon: <Building2 size={18} /> },
      { label: "Publishers", path: "/publishers", icon: <Users size={18} /> },
      { label: "Offers", path: "/offers", icon: <Gift size={18} /> },
      { label: "Templates", path: "/templates", icon: <FileCode size={18} /> },
      { label: "Landing Builder", path: "/landing-builder", icon: <Layers size={18} /> },
    ],
    "Tracking & Analytics": [
      { label: "Tracking", path: "/tracking", icon: <Link2 size={18} /> },
      { label: "Clicks", path: "/clicks", icon: <MousePointerClick size={18} /> },
      { label: "Conversions", path: "/conversions", icon: <LineChart size={18} /> },
      { label: "Postbacks", path: "/postbacks", icon: <Repeat size={18} /> },
      { label: "Fraud Alerts", path: "/fraud-alerts", icon: <AlertTriangle size={18} /> },
      { label: "Traffic Distribution", path: "/traffic-distribution", icon: <Shuffle size={18} /> },
    ],
    "Developer": [
      { label: "API Docs", path: "/api-docs", icon: <FileCode size={18} /> },
    ],
  };

  const filteredMenu = {};
  Object.keys(groupedMenu).forEach((section) => {
    filteredMenu[section] = groupedMenu[section].filter((item) =>
      item.label.toLowerCase().includes(search.toLowerCase())
    );
  });

  const SidebarContent = () => (
    <div
      className={`h-full flex flex-col bg-[#0c0f18]/80 backdrop-blur-xl border-r border-white/10 shadow-xl transition-all duration-300 ${collapsed ? "w-20" : "w-64"}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <img src="/logo192.png" alt="logo" className="w-9 h-9 rounded-xl shadow" />
          {!collapsed && <span className="text-lg font-semibold text-white">Mob13r</span>}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-white/10"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Search Bar */}
      {!collapsed && (
        <div className="px-3 py-2">
          <div className="flex items-center bg-white/10 rounded-xl px-3 py-2 gap-2">
            <Search size={16} className="text-gray-300" />
            <input
              type="text"
              placeholder="Search menu..."
              className="bg-transparent outline-none text-sm text-white w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-4">
        {Object.keys(filteredMenu).map((section) => (
          filteredMenu[section].length > 0 && (
            <div key={section}>
              {!collapsed && (
                <h4 className="text-xs text-gray-400 px-3 mb-1 tracking-wider">
                  {section}
                </h4>
              )}
              {filteredMenu[section].map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 p-3 rounded-xl text-sm transition-all border border-transparent cursor-pointer
                    ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                        : "text-gray-300 hover:bg-white/10 hover:border-white/10"
                    }`
                  }
                >
                  <span>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          )
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 text-xs text-gray-400 text-center">
        {!collapsed && `© ${new Date().getFullYear()} Mob13r Digital Media`}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block h-screen sticky top-0">
        <SidebarContent />
      </div>

      {/* Mobile Toggle Button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-3 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 text-white"
        onClick={() => setMobileOpen(true)}
      >
        <Menu size={20} />
      </button>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden flex">
          <div className="h-full w-64 bg-[#0c0f18] shadow-xl">
            <SidebarContent />
          </div>
          <div
            className="flex-1"
            onClick={() => setMobileOpen(false)}
          />

          <button
            className="absolute top-4 right-4 p-2 bg-black/40 rounded-xl text-white"
            onClick={() => setMobileOpen(false)}
          >
            <X size={22} />
          </button>
        </div>
      )}
    </>
  );
}
