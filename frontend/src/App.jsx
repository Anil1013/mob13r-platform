// File: frontend/src/App.jsx
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

// NOTE: relative imports (no '@/')
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";

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

// import Sidebar as a separate component
import Sidebar from "./components/Sidebar";

function Topbar({ onToggleSidebar, onToggleTheme, theme }) {
  return (
    <header className="w-full flex items-center justify-between gap-4 p-4 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-lg font-semibold tracking-wide">Mob13r Platform</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
          <Bell size={16} />
        </button>
      </div>
    </header>
  );
}

function AuthGuard({ children, isLoginPage }) {
  const token = localStorage.getItem("mob13r_token");
  if (!token && !isLoginPage) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

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
                    <td className="px-3 py-2">Pub {i + 1}</td>
                    <td className="px-3 py-2">IN</td>
                    <td className="px-3 py-2">Offer {i + 1}</td>
                    <td className="px-3 py-2">{Math.floor(Math.random() * 9000)}</td>
                    <td className="px-3 py-2">{Math.floor(Math.random() * 300)}</td>
                    <td className="px-3 py-2">{(Math.random() * 10).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLoginPage = location.pathname === "/login";

  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(localStorage.getItem("mob13r_token")));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const onStorage = () => setIsLoggedIn(Boolean(localStorage.getItem("mob13r_token")));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!isLoggedIn && !isLoginPage) navigate("/login", { replace: true });
  }, [isLoggedIn, isLoginPage, navigate]);

  if (!isLoggedIn && !isLoginPage) return null;

  const handleNavigate = (to) => navigate(to);

  return (
    <MotionConfig transition={{ duration: 0.25 }}>
      <div className="flex min-h-screen bg-gray-50 dark:bg-[#061021] text-gray-900 dark:text-white">
        <div className="hidden md:block">
          <Sidebar collapsed={collapsed} onNavigate={handleNavigate} activePath={location.pathname} />
        </div>

        <div className="flex-1 flex flex-col">
          <Topbar onToggleSidebar={() => setCollapsed((s) => !s)} onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} theme={theme} />

          <main className="flex-1 overflow-y-auto p-6">
            <Suspense fallback={<div className="p-6">Loading...</div>}>
              <AuthGuard isLoginPage={isLoginPage}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/advertisers" element={<Advertisers />} />
                  <Route path="/publishers" element={<Publishers />} />
                  <Route path="/clicks" element={<Clicks />} />
                  <Route path="/conversions" element={<Conversions />} />
                  <Route path="/postbacks" element={<Postbacks />} />
                  <Route path="/offers" element={<Offers />} />
                  <Route path="/templates" element={<Templates />} />
                  <Route path="/tracking" element={<PublisherTracking />} />
                  <Route path="/api-docs" element={<ApiDocs />} />
                  <Route path="/fraud-alerts" element={<FraudAlerts />} />
                  <Route path="/landing-builder" element={<LandingBuilder />} />
                  <Route path="/traffic-distribution" element={<TrafficDistribution />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </AuthGuard>
            </Suspense>
          </main>
        </div>
      </div>
    </MotionConfig>
  );
}
