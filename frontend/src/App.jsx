import React, { useEffect, useMemo, useState, Suspense } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { MotionConfig, motion } from "framer-motion";
import { Menu, Bell, User, Sun, Moon, LogOut } from "lucide-react";

// shadcn/ui components (assumed available in your project)
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Lazy pages (example) - swap these with your real pages
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

// Local lightweight components (in-file for single-file preview)
function Topbar({ onToggleSidebar, onToggleTheme, theme }) {
  return (
    <header className="w-full flex items-center justify-between gap-4 p-4 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-3">
        <button
          aria-label="Toggle sidebar"
          onClick={onToggleSidebar}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Menu size={18} />
        </button>

        <h1 className="text-lg font-semibold">Mob13r Platform</h1>

        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-gray-50 dark:bg-gray-800">
          <span className="text-xs text-muted-foreground">Environment</span>
          <strong className="ml-1">Production</strong>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={onToggleTheme} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
          <Bell size={16} />
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <img src="/avatar.png" alt="avatar" className="w-8 h-8 rounded-full object-cover" />
          <span className="text-sm">Anil</span>
        </div>
      </div>
    </header>
  );
}

function Sidebar({ collapsed, onNavigate, activePath }) {
  const items = useMemo(() => [
    { label: "Dashboard", to: "/dashboard", icon: "🏠" },
    { label: "Advertisers", to: "/advertisers", icon: "💼" },
    { label: "Publishers", to: "/publishers", icon: "👥" },
    { label: "Clicks", to: "/clicks", icon: "🖱️" },
    { label: "Conversions", to: "/conversions", icon: "⚡" },
    { label: "Postbacks", to: "/postbacks", icon: "🔗" },
    { label: "Offers", to: "/offers", icon: "🎁" },
    { label: "Templates", to: "/templates", icon: "📄" },
    { label: "Tracking", to: "/tracking", icon: "📡" },
    { label: "API Docs", to: "/api-docs", icon: "📘" },
    { label: "Fraud Alerts", to: "/fraud-alerts", icon: "🚨" },
    { label: "Landing Builder", to: "/landing-builder", icon: "🛠️" },
    { label: "Traffic Distribution", to: "/traffic-distribution", icon: "🌐" }
  ], []);

  return (
    <aside
      className={`h-screen sticky top-0 z-20 bg-white/80 dark:bg-[#0b1220]/80 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800 shadow-lg ${collapsed ? "w-20" : "w-64"} transition-all duration-300`}
    >
      <div className="flex flex-col h-full">
        {/* Logo Section */}
        <div className="p-4 flex items-center gap-3 border-b border-gray-100 dark:border-gray-900">
          <img src="/logo192.png" alt="logo" className="w-10 h-10 rounded-xl shadow" />
          {!collapsed && <strong className="text-xl font-semibold tracking-wide">Mob13r</strong>}
        </div>

        {/* Nav Section */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {items.map((it) => (
            <button
              key={it.to}
              onClick={() => onNavigate(it.to)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer
                ${activePath === it.to
                  ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                  : "hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300"
                }`}
            >
              <span className="text-lg">{it.icon}</span>
              {!collapsed && <span className="font-medium">{it.label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer Section */}
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

function AuthGuard({ children, isLoginPage }) {
  // simple guard using localStorage token
  const token = localStorage.getItem("mob13r_token");
  if (!token && !isLoginPage) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function DashboardGrid() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Traffic Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 flex items-center justify-center">(Charts go here)</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Offers</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li className="flex justify-between"><span>Offer A</span><strong>₹12,345</strong></li>
            <li className="flex justify-between"><span>Offer B</span><strong>₹8,920</strong></li>
            <li className="flex justify-between"><span>Offer C</span><strong>₹6,112</strong></li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Realtime Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 overflow-auto">No alerts</div>
        </CardContent>
      </Card>
    </div>
  );
}

// Traffic Distribution page (Integrated Full Page) (example of an upgraded UI module)
function TrafficDistribution() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Traffic Distribution</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline">Export CSV</Button>
          <Button size="sm">Apply Filters</Button>
        </div>
      </div>

      {/* Stats Row */}
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>By Publisher</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56 flex items-center justify-center text-sm opacity-70">(Donut Chart)</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>By Country</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56 flex items-center justify-center text-sm opacity-70">(World Map Heatmap)</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Offer Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56 flex items-center justify-center text-sm opacity-70">(Stacked Bar Chart)</div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader><CardTitle>Click ➝ Conversion Funnel</CardTitle></CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-sm opacity-70">(Funnel Chart)</div>
        </CardContent>
      </Card>

      {/* Table */}
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
  const [theme, setTheme] = useState(() => (localStorage.getItem("theme") || "light"));
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

  // avoid content flicker while guard redirects
  if (!isLoggedIn && !isLoginPage) return null;

  const handleNavigate = (to) => navigate(to);

  return (
    <MotionConfig transition={{ duration: 0.25 }}>
      <div className="flex min-h-screen bg-gray-50 dark:bg-[#061021] text-gray-900 dark:text-white">
        {/* Sidebar */}
        <div className="hidden md:block">
          <Sidebar collapsed={collapsed} onNavigate={handleNavigate} activePath={location.pathname} />
        </div>

        {/* Mobile collapsed bar */}
        <div className={`md:hidden fixed left-0 top-0 z-30 p-2 ${collapsed ? "w-16" : "w-full"}`}></div>

        <div className="flex-1 flex flex-col">
          <Topbar onToggleSidebar={() => setCollapsed((s) => !s)} onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} theme={theme} />

          <main className="flex-1 overflow-y-auto p-6">
            <Suspense fallback={<div className="p-6">Loading...</div>}>
              <AuthGuard isLoginPage={isLoginPage}>
                <Routes>
                  <Route path="/login" element={<Login />} />

                  <Route path="/" element={<Dashboard /> } />
                  <Route path="/dashboard" element={<div className="space-y-6"><DashboardGrid /><Card><CardContent><TrafficDistribution /></CardContent></Card></div>} />
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

                  <Route path="/traffic-distribution" element={<TrafficDistribution />} />} />

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
