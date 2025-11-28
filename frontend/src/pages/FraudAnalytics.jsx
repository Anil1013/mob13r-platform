// frontend/src/pages/FraudAnalytics.jsx
import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient";

// Library imports
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

// Color palette
const COLORS = ["#4F46E5", "#EF4444", "#F59E0B", "#10B981", "#06B6D4", "#8B5CF6"];

// Safe LocalStorage getter
const getLS = (key) => (typeof window === "undefined" ? null : localStorage.getItem(key));

export default function FraudAnalytics() {
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [liveFeed, setLiveFeed] = useState([]);

  const [pubFilter, setPubFilter] = useState("");
  const [geoFilter, setGeoFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  const [limit, setLimit] = useState(500);

  // Build query params
  const buildParams = () => {
    const p = {};
    if (pubFilter) p.pub_id = pubFilter;
    if (geoFilter) p.geo = geoFilter;
    if (severityFilter) p.severity = severityFilter;
    if (dateFrom) p.from = dateFrom;
    if (dateTo) p.to = dateTo;
    p.limit = limit;
    return p;
  };

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/fraud/alerts", {
        params: buildParams(),
      });
      const rows = res.data || [];
      setAlerts(rows);
      setLiveFeed(rows.slice(0, 25));
    } catch (err) {
      console.error("fetchAlerts error", err);
      setAlerts([]);
      setLiveFeed([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const iv = setInterval(fetchAlerts, 20000);
    return () => clearInterval(iv);
  }, []);

  // ---------------------------
  // Metrics (Top-level KPIs)
  // ---------------------------
  const metrics = useMemo(() => {
    const total = alerts.length;
    const high = alerts.filter((a) => a.severity?.toLowerCase() === "high").length;
    const uniqueIps = new Set(alerts.map((a) => a.ip)).size;

    const pubCount = {};
    alerts.forEach((a) => {
      pubCount[a.pub_id] = (pubCount[a.pub_id] || 0) + 1;
    });

    const topPub = Object.entries(pubCount).sort((a, b) => b[1] - a[1])[0] || ["None", 0];

    return {
      total,
      high,
      uniqueIps,
      topPub: topPub[0],
      topPubCount: topPub[1],
    };
  }, [alerts]);

  // ---------------------------
  // Time Series
  // ---------------------------
  const timeseries = useMemo(() => {
    const map = {};
    alerts.forEach((a) => {
      const d = new Date(a.created_at);
      if (isNaN(d)) return;
      const key = d.toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + 1;
    });

    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));
  }, [alerts]);

  // ---------------------------
  // Reason Breakdown (Pie)
  // ---------------------------
  const reasonData = useMemo(() => {
    const map = {};
    alerts.forEach((a) => {
      const r = a.reason || "Unknown";
      map[r] = (map[r] || 0) + 1;
    });

    return Object.entries(map)
      .slice(0, 12)
      .map(([name, value]) => ({ name, value }));
  }, [alerts]);

  // ---------------------------
  // GEO Breakdown (Bar)
  // ---------------------------
  const geoData = useMemo(() => {
    const map = {};
    alerts.forEach((a) => {
      const r = a.geo || "XX";
      map[r] = (map[r] || 0) + 1;
    });

    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([geo, count]) => ({ geo, count }));
  }, [alerts]);

  // ---------------------------
  // Actions
  // ---------------------------
  const resolveAlert = async (id) => {
    try {
      await apiClient.post(`/fraud/alerts/${id}/resolve`, {
        resolved_by: getLS("mob13r_admin") || "ui",
      });
      fetchAlerts();
    } catch (err) {
      console.error("resolveAlert error", err);
      alert("Failed to resolve");
    }
  };

  const whitelistPub = async (pub) => {
    if (!pub) return alert("No PUB");
    try {
      await apiClient.post("/fraud/whitelist", {
        pub_id: pub,
        note: "From analytics UI",
        created_by: getLS("mob13r_admin_id"),
      });
      alert("PUB whitelisted");
      fetchAlerts();
    } catch (err) {
      alert("Whitelist failed");
    }
  };

  const blacklistIp = async (ip) => {
    if (!ip) return alert("No IP");
    try {
      await apiClient.post("/fraud/blacklist", {
        ip,
        note: "From analytics UI",
        created_by: getLS("mob13r_admin_id"),
      });
      alert("IP blacklisted");
      fetchAlerts();
    } catch (err) {
      alert("Blacklist failed");
    }
  };

  // ---------------------------
  // Export handler
  // ---------------------------
  const exportFile = async (format = "csv") => {
    try {
      const params = buildParams();
      params.format = format;

      const res = await apiClient.get("/fraud/export", {
        params,
        responseType: "blob",
      });

      let filename = `fraud_${params.pub_id || "all"}.${format}`;
      const blob = new Blob([res.data]);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Export failed");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">🚨 Fraud Analytics Dashboard</h1>

      {/* Filters */}
      <div className="flex gap-3 mb-4 items-center">
        <input
          placeholder="PUB03"
          value={pubFilter}
          onChange={(e) => setPubFilter(e.target.value.toUpperCase())}
          className="border p-2 rounded w-32"
        />
        <input
          placeholder="Geo (BD)"
          value={geoFilter}
          onChange={(e) => setGeoFilter(e.target.value.toUpperCase())}
          className="border p-2 rounded w-24"
        />

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="border p-2 rounded"
        />

        <button
          onClick={fetchAlerts}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Apply
        </button>

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => exportFile("csv")}
            className="bg-gray-800 text-white px-3 py-2 rounded"
          >
            Export CSV
          </button>
          <button
            onClick={() => exportFile("xlsx")}
            className="bg-gray-800 text-white px-3 py-2 rounded"
          >
            Export XLSX
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard title="Total Alerts" value={metrics.total} />
        <MetricCard title="High Severity" value={metrics.high} color="red" />
        <MetricCard title="Unique IPs" value={metrics.uniqueIps} color="blue" />
        <MetricCard
          title="Top PUB"
          value={`${metrics.topPub} (${metrics.topPubCount})`}
          color="green"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Time series */}
        <ChartCard title="Alerts Over Time">
          <ResponsiveContainer>
            <LineChart data={timeseries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#4F46E5"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Geo */}
        <ChartCard title="Top GEOs">
          <ResponsiveContainer>
            <BarChart data={geoData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="geo" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#06B6D4" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Reasons */}
        <ChartCard title="Reason Breakdown">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={reasonData}
                dataKey="value"
                nameKey="name"
                outerRadius={80}
                label
              >
                {reasonData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Table + live feed */}
      <div className="grid grid-cols-3 gap-4">
        {/* Table */}
        <div className="col-span-2 bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Alerts Table</h3>
          <div className="overflow-x-auto max-h-[450px] overflow-y-scroll">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-2">PUB</th>
                  <th className="p-2">IP</th>
                  <th className="p-2">Reason</th>
                  <th className="p-2">Severity</th>
                  <th className="p-2">Resolved</th>
                  <th className="p-2">Time</th>
                  <th className="p-2">Action</th>
                </tr>
              </thead>

              <tbody>
                {!loading &&
                  alerts.map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="p-2">{a.pub_id}</td>
                      <td className="p-2 font-mono">{a.ip}</td>
                      <td className="p-2">{a.reason}</td>
                      <td className="p-2">{a.severity}</td>
                      <td className="p-2">{a.resolved ? "Yes" : "No"}</td>
                      <td className="p-2">
                        {new Date(a.created_at).toLocaleString()}
                      </td>
                      <td className="p-2 flex gap-2">
                        {!a.resolved && (
                          <button
                            onClick={() => resolveAlert(a.id)}
                            className="bg-green-600 text-white px-2 py-1 rounded text-xs"
                          >
                            Resolve
                          </button>
                        )}
                        <button
                          onClick={() => whitelistPub(a.pub_id)}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
                        >
                          Whitelist
                        </button>
                        <button
                          onClick={() => blacklistIp(a.ip)}
                          className="bg-red-600 text-white px-2 py-1 rounded text-xs"
                        >
                          Block IP
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Feed */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Live Feed (last 25)</h3>
          <div className="space-y-2 max-h-[450px] overflow-y-auto text-xs">
            {liveFeed.map((l) => (
              <div key={l.id} className="p-2 border rounded">
                <div className="flex justify-between">
                  <div className="font-mono">{l.ip}</div>
                  <div className="text-gray-500">
                    {new Date(l.created_at).toLocaleTimeString()}
                  </div>
                </div>
                <div className="text-sm">
                  <strong>{l.pub_id}</strong> — {l.reason}{" "}
                  <span className="text-gray-500">({l.severity})</span>
                </div>
                <div className="break-words text-gray-700">{l.ua}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------
// UI Helper Components
// ---------------------------
function MetricCard({ title, value, color }) {
  const colorMap = {
    red: "text-red-600",
    blue: "text-blue-600",
    green: "text-green-600",
  };
  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="text-sm text-gray-500">{title}</div>
      <div className={`text-2xl font-semibold ${colorMap[color] || ""}`}>
        {value}
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-2">{title}</h3>
      <div style={{ height: 260 }}>{children}</div>
    </div>
  );
}
