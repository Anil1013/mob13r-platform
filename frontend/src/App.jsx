// File: frontend/src/App.jsx
// NEW upgraded UI (Sidebar + Topbar + Animations)

import React, { useEffect, useMemo, useState, Suspense } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { MotionConfig } from "framer-motion";

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


// TOPBAR
function Topbar({ onToggleSidebar, onToggleTheme, theme }) {
  return (
    <header className="w-full flex items-center justify-between gap-4 p-4 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
          <Menu size={18} />
        </button>
        <h1 className="text-lg font-semibold tracking-wide">Mob13r Platform</h1>
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


// SIDEBAR
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
      { label: "Traffic Distribution", to: "/traffic-distribution", icon: <Shuffle size={18} /> }
    ],
    []
  );

  return (
    <aside className={`h-screen sticky top-0 z-20 bg-white/80 dark:bg-[#0b1220]/80 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800 shadow-lg transition-all duration-300 ${collapsed ? "w-20" : "w-64"}`}>
      <div className="flex flex-col h-full">

        <div className="p-4 flex items-center gap-3 border-b border-gray-100 dark:border-gray-900">
          <img src="/logo192.png" alt="logo" className="w-10 h-10 rounded-xl shadow" />
          {!collapsed && <strong className="text-xl font-semibold tracking-wide">Mob13r</strong>}
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {items.map((it) => (
            <button
              key={it.to}
              onClick={() => onNavigate(it.to)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${activePath === it.to ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md" : "hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300"}`}
            >
              <span>{it.icon}</span>
              {!collapsed && <span className="font-medium">{it.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <Button
            onClick={() => {
              localStorage.removeItem("mob13r_token");
              window.location.href = "/login";
            }}
            className="w-full rounded-xl"
          >
            Sign Out
          </Button>
        </div>

      </div>
    </aside>
  );
}


// AUTH GUARD
function AuthGuard({ children, isLoginPage }) {
  const token = localStorage.getItem("mob13r_token");
  if (!token && !isLoginPage) return <Navigate to="/login" replace />;
  return <>{children}</>;
}


// TRAFFIC DISTRIBUTION PAGE
function TrafficDistribution() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Traffic Distribution</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline">Export CSV</Button>
          <Button size="sm">Apply Filters</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Total Clicks</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">124,532</div></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Total Conversions</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">7,893</div></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Global CR</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">6.34%</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Traffic Logs</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-80 rounded-md">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-[#071025]">
                <tr>
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">Publisher</th>
                  <th className="px-3 py-2">Country</th>
                  <th className="px-3 py-2">Offer</th>
                  <th className="px-3 py-2">Clicks</th>
                  <th className="px-3 py-2">Conversions</th>
                  <th className="px-3 py-2">CR%</th>
                </tr>
              </thead>

              <tbody>
                {Array.from({ length: 15 }).map((_, i) => (
                  <tr key={i} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-3 py-2">2025-11-16 12:{10 + i}</td>
                    <td className="px-3 py-2">Pub {
