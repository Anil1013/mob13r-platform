import React, { useEffect, useMemo, useState, Suspense } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { MotionConfig } from "framer-motion";

// Icons
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
  Menu,
  Bell,
  Sun,
  Moon,
} from "lucide-react";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Lazy pages
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Advertisers = React.lazy(() => import("./pages/Advertisers"));
const Publishers = React.lazy(() => import("./pages/Publishers"));
const Clicks = React.lazy(() => import("./pages/Clicks"));
const Conversions = React.lazy(() => import("./pages/Conversions"));
const Postbacks = React.lazy(() => import("./pages/Postbacks"));
const Offers = React.lazy(() => import("./pages/Offers"));
const Templates = React.lazy(() => import("./pages/Templates"));
const PublisherTracking = React.lazy(() => import("./pages/PublisherTracking"));
const ApiDocs = React.lazy(() => import("./pages/ApiDocs"));
const FraudAlerts = React.lazy(() => import("./pages/FraudAlerts"));
const LandingBuilder = React.lazy(() => import("./pages/LandingBuilder"));
const Login = React.lazy(() => import("./pages/Login"));

// ------------------------------------------------------
// TOPBAR
// ------------------------------------------------------
function Topbar({ onToggleSidebar, onToggleTheme, theme }) {
  return (
    <header className="w-full flex items-center justify-between gap-4 p-4 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
          <Menu size={18} />
        </button>
        <h1 className="text-lg font-semibold">Mob13r Platform</h1>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={onToggleTheme} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
          <Bell size={16} />
        </button>
      </div>
    </header>
  );
}

// ------------------------------------------------------
// SIDEBAR (ICONS — NO EMOJIS)
// ------------------------------------------------------
function Sidebar({ collapsed, onNavigate, activePath }) {
  const items = useMemo(
    () => [
      { label: "Dashboard", to: "/dashboard", icon: <LayoutDashboard size={18} /> },
      { label: "Advertisers", to: "/advertisers", icon: <Building2 size={18} /> },
      { label: "Publishers", to: "/publishers", icon: <Users size={18} /> },
      { label: "Clicks", to: "/clicks", icon: <MousePointerClick size={18} /> },
      { label: "Conversions", to: "/conversions", icon: <LineChart size={18} /> },
      { label: "Postbacks", to: "/postbacks", icon: <Repeat size={18} /> },
      { label: "Offers", to: "/offers", icon: <Gift size={18} /> },
      { label: "Templates", to: "/templates", icon: <FileCode size={18} /> },
      { label: "Tracking", to: "/tracking", icon: <Link2 size={18} /> },
      { label: "API Docs", to: "/api-docs", icon: <FileCode size={18} /> },
      { label: "Fraud Alerts", to: "/fraud-alerts", icon: <AlertTriangle size={18} /> },
      { label: "Landing Builder", to: "/landing-builder", icon: <Layers size={18} /> },
      { label: "Traffic Distribution", to: "/traffic-distribution", icon: <Shuffle size={18} /> },
    ],
    []
  );

  return (
    <aside
      className={`h-screen sticky top-0 z-20 bg-white/80 dark:bg-[#0b1220]/80 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800 shadow-lg ${
        collapsed ? "w-20" : "w-64"
      } transition-all duration-300`}
    >
