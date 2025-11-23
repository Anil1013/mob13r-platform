// File: frontend/src/components/Sidebar.jsx
// FINAL — Stable / No Errors / Fraud Analytics added

import React, { useEffect, useRef, useState } from "react";
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
  User,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";

const MENU = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" }],
  },
  {
    title: "Management",
    items: [
      { label: "Advertisers", icon: Building2, to: "/advertisers" },
      { label: "Publishers", icon: Users, to: "/publishers" },
      { label: "Offers", icon: Gift, to: "/offers" },
      { label: "Templates", icon: FileText, to: "/templates" },
      { label: "Landing Builder", icon: Layers, to: "/landing-builder" },
    ],
  },
  {
    title: "Analytics",
    items: [
      { label: "Tracking", icon: TrendingUp, to: "/tracking" },
      { label: "Clicks", icon: MousePointerClick, to: "/clicks" },
      { label: "Conversions", icon: BarChart3, to: "/conversions" },
      { label: "Postbacks", icon: Repeat, to: "/postbacks" },
      { label: "Fraud Alerts", icon: ShieldAlert, to: "/fraud-alerts" },
      { label: "Fraud Analytics", icon: ShieldAlert, to: "/fraud-analytics" }, // NEW
      { label: "Traffic Distribution", icon: TrendingUp, to: "/traffic-distribution" },
    ],
  },
];

const ACCENT_GRADIENT = "from-blue-500 to-indigo-600";

export default function Sidebar() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const dragRef = useRef(null);

  const initialWidth = Number(localStorage.getItem("sidebarWidth") || 280);
  const [width, setWidth] = useState(initialWidth);
  const [collapsed, setCollapsed] = useState(initialWidth <= 80);

  const [openSections, setOpenSections] = useState({
    overview: true,
    management: true,
    analytics: true,
  });

  const [microStats, setMicroStats] = useState({
    clicks: 0,
    conv: 0,
    rev: 0,
  });

  const [hoverExpand, setHoverExpand] = useState(false);

  // Load micro stats on mount
  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("https://backend.mob13r.com/api/stats", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("mob13r_token")}`,
          },
        });

        const data = await res.json();
        setMicroStats({
          clicks: data.totalClicks || 0,
          conv: data.totalConversions || 0,
          rev: data.totalRevenue || 0,
        });
      } catch (err) {}
    }
    loadStats();
  }, []);

  // Handle resizing
  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current) return;

      const startX = dragRef.current.startX;
      const startW = dragRef.current.startW;
      const clientX = e.clientX || (e.touches?.[0]?.clientX || 0);

      const newW = Math.max(70, Math.min(500, startW + (clientX - startX)));
      setWidth(newW);
    };

    const stop = () => {
      dragRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", stop);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", stop);
    };

    const start = (e) => {
      dragRef.current = {
        startX: e.clientX || (e.touches?.[0]?.clientX || 0),
        startW: width,
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", stop);
      document.addEventListener("touchmove", onMove);
      document.addEventListener("touchend", stop);
    };

    const bar = containerRef.current?.querySelector(".drag-bar");
    bar?.addEventListener("mousedown", start);
    bar?.addEventListener("touchstart", start);

    return () => {
      bar?.removeEventListener("mousedown", start);
      bar?.removeEventListener("touchstart", start);
    };
  }, [width]);

  useEffect(() => {
    localStorage.setItem("sidebarWidth", width);
    setCollapsed(width <= 80);
  }, [width]);

  const toggleSection = (key) =>
    setOpenSections((p) => ({ ...p, [key]: !p[key] }));

  return (
    <aside
      ref={containerRef}
      style={{ width: collapsed && !hoverExpand ? 72 : width }}
      className="fixed top-4 left-4 h-[92vh] z-50 rounded-2xl shadow-2xl border border-white/10 bg-white/30 dark:bg-black/40 backdrop-blur-xl transition-all"
      onMouseEnter={() => collapsed && setHoverExpand(true)}
      onMouseLeave={() => collapsed && setHoverExpand(false)}
    >
      {/* HEADER */}
      <div className="px-3 py-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="logo" className="w-10 h-10 rounded-lg" />
          {!collapsed && (
            <div>
              <div className="font-bold text-lg">Mob13r</div>
              <div className="text-xs text-gray-500">Platform</div>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-white/10 rounded-md"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* MICRO STATS */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-white/10">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-white/10 rounded-lg">
              <div className="text-xs text-gray-500">Clicks</div>
              <div className="font-semibold">{microStats.clicks}</div>
            </div>
            <div className="p-2 bg-white/10 rounded-lg">
              <div className="text-xs text-gray-500">Conv</div>
              <div className="font-semibold">{microStats.conv}</div>
            </div>
            <div className="p-2 bg-white/10 rounded-lg">
              <div className="text-xs text-gray-500">Revenue</div>
              <div className="font-semibold">₹{microStats.rev}</div>
            </div>
          </div>
        </div>
      )}

      {/* MENU */}
      <div className="px-2 py-3 h-[46vh] overflow-y-auto">
        {MENU.map((section) => {
          const key = section.title.toLowerCase();
          const isOpen = openSections[key];

          return (
            <div key={key} className="mb-4">
              {!collapsed && (
                <div className="flex items-center justify-between px-2 mb-2 text-xs uppercase text-gray-500 font-sem
