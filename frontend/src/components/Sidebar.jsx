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
  ChevronRight,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";

function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  const sections = [
    {
      title: "Analytics",
      items: [
        { name: "Dashboard", path: "/", icon: <LayoutDashboard size={18} /> },
        { name: "Traffic Distribution", path: "/traffic-distribution", icon: <Shuffle size={18} /> },
      ],
    },
    {
      title: "Management",
      items: [
        { name: "Advertisers", path: "/advertisers", icon: <Building2 size={18} /> },
        { name: "Offers", path: "/offers", icon: <Gift size={18} /> },
        { name: "Publishers", path: "/publishers", icon: <Users size={18} /> },
        { name: "Templates", path: "/templates", icon: <FileCode size={18} /> },
        { name: "Landing Builder", path: "/landing-builder", icon: <Layers size={18} /> },
      ],
    },
    {
      title: "Tracking",
      items: [
        { name: "Clicks", path: "/clicks", icon: <MousePointerClick size={18} /> },
        { name: "Conversions", path: "/conversions", icon: <LineChart size={18} /> },
        { name: "Postbacks", path: "/postbacks", icon: <Repeat size={18} /> },
        { name: "Tracking", path: "/tracking", icon: <Link2 size={18} /> },
      ],
    },
    {
      title: "System",
      items: [
        { name: "Fraud Alerts", path: "/fraud-alerts", icon: <AlertTriangle size={18} /> },
        { name: "API Docs", path: "/api-docs", icon: <FileCode size={18} /> },
      ],
    },
  ];

  return (
    <aside
      className={`
        ${collapsed ? "w-20" : "w-64"}
        h-screen fixed left-0 top-0 z-50
        bg-gray-900/70 backdrop-blur-xl
        border-r border-white/10 shadow-2xl shadow-black/40
        transition-all duration-300
        group
      `}
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
    >
      {/* Logo + Collapse btn */}
      <div className="flex items-center justify-between h-20 px-4 border-b border-white/10">
        <img
          src="/logo.png"
          alt="Mob13r Logo"
          className="w-12 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]"
        />

        {!collapsed && (
          <button className="p-2 hover:bg-white/10 rounded-lg transition">
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* MENU */}
      <nav className="flex-1 mt-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent px-3">
        
        {sections.map((section) => (
          <div key={section.title} className="mb-4">
            {!collapsed && (
              <p className="text-xs text-gray-400 uppercase px-3 mb-2 tracking-wider">
                {section.title}
              </p>
            )}

            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.name}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `
                      flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium 
                      text-gray-300 transition-all duration-200

                      ${isActive
                        ? "bg-orange-500/20 text-orange-400 border border-orange-500/40 shadow-lg shadow-orange-500/20 scale-[1.02]"
                        : "hover:bg-white/10 hover:text-white"}
                      `
                    }
                  >
                    <span className="opacity-90">{item.icon}</span>
                    {!collapsed && <span>{item.name}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* FOOTER */}
      <div className="p-4 border-t border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-3 mb-3">
            <img
              src="/avatar.png"
              alt="User"
              className="w-10 h-10 rounded-full border border-white/10"
            />
            <div>
              <p className="text-gray-200 text-sm font-medium">Anil</p>
              <p className="text-gray-400 text-xs">Admin</p>
            </div>
          </div>
        )}

        <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-gray-300 hover:bg-white/10 transition">
          <LogOut size={18} />
          {!collapsed && <span>Sign Out</span>}
        </button>

        {!collapsed && (
          <p className="text-center text-[10px] text-gray-500 mt-3 tracking-wider">
            © {new Date().getFullYear()} Mob13r Digital Media
          </p>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
