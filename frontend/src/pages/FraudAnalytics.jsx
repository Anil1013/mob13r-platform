// frontend/src/pages/FraudAnalytics.jsx
import React, { useEffect, useMemo, useState } from "react";
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
  Legend,
} from "recharts";

import apiClient from "../api/apiClient";

const COLORS = ["#4F46E5", "#EF4444", "#F59E0B", "#10B981", "#06B6D4", "#8B5CF6"];

export default function FraudAnalytics() {
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [liveFeed, setLiveFeed] = useState([]);

  const [pubFilter, setPubFilter] = useState("");
  const [geoFilter, setGeoFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [limit, setLimit] = useState(500);

  const fetchAlerts = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (pubFilter) params.append("pub_id", pubFilter);
      if (geoFilter) params.append("geo", geoFilter);
      if (severityFilter) params.append("severity", severityFilter);
      if (dateFrom) params.append("from", dateFrom);
      if (dateTo) params.append("to", dateTo);
      params.append("limit", limit.toString());

      const res = await apiClient.get(`/fraud/alerts?${params.toString()}`);

      setAlerts(res.data || []);
      setLiveFeed((res.data || []).slice(0, 20));
    } catch (err) {
      console.error("fetchAlerts error", err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const iv = setInterval(fetchAlerts, 20000);
    return () => clearInterval(iv);
  }, []);

  const metrics = useMemo(() => {
    const total = alerts.length;
    const high = alerts.filter(
      (a) => (a.severity || "").toLowerCase() === "high"
    ).length;
    const uniqueIps = new Set(alerts.map((a) => a.ip)).size;

    const byPub = {};
    alerts.forEach((a) => {
      byPub[a.pub_id] = (byPub[a.pub_id] || 0) + 1;
    });

    const topPub = Object.entries(byPub).sort((a, b) => b[1] - a[1])[0] || [
      null,
      0,
    ];

    return {
      total,
      high,
      uniqueIps,
      topPub: topPub[0],
      topPubCount: topPub[1],
    };
  }, [alerts]);

  const timeseries = useMemo(() => {
    const map = {};

    alerts.forEach((a) => {
      const d = new Date(a.created_at || Date.now());
      const key = d.toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + 1;
    });

    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, alerts]) => ({ date, alerts }));
  }, [alerts]);

  const reasonData = useMemo(() => {
    const map = {};
    alerts.forEach((a) => {
      const r = a.reason || "unknown";
      map[r] = (map[r] || 0) + 1;
    });

    return Object.entries(map)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [alerts]);

  const resolveAlert = async (id) => {
    try {
      await apiClient.post(`/fraud/alerts/${id}/resolve`, {
        resolved_by: localStorage.getItem("mob13r_admin") || "ui",
      });
      fetchAlerts();
    } catch (err) {
      alert("Resolve failed");
    }
  };

  const whitelistPub = async (pub) => {
    try {
      if (!pub) return alert("No PUB ID");

      await apiClient.post("/fraud/whitelist", {
        pub_id: pub,
        note: "Analytics UI",
        created_by: localStorage.getItem("mob13r_admin_id") || null,
      });

      alert("PUB Whitelisted");
      fetchAlerts();
    } catch (err) {
      alert("Whitelist failed");
    }
  };

  const blacklistIp = async (ip) => {
    try {
      if (!ip) return alert("No IP");

      await apiClient.post("/fraud/blacklist", {
        ip,
        note: "Analytics UI",
        created_by: localStorage.getItem("mob13r_admin_id") || null,
      });

      alert("IP Blacklisted");
      fetchAlerts();
    } catch (err) {
      alert("Blacklist failed");
    }
  };

  const exportCSV = (format = "csv") => {
    const token = localStorage.getItem("mob13r_token");
    const params = new URLSearchParams();

    if (pubFilter) params.append("pub_id", pubFilter);
    if (severityFilter) params.append("severity", severityFilter);
    if (geoFilter) params.append("geo", geoFilter);

    params.append("format", format);
    params.append("token", token);

    const url = `${apiClient.defaults.baseURL}/fraud/export?${params.toString()}`;

    window.open(url, "_blank");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Fraud Analytics Dashboard</h1>

      {/* Filters */}
      <div className="flex gap-3 mb-5 items-center">
        <input
          placeholder="PUB03"
          value={pubFilter}
          onChange={(e) => setPubFilter(e.target.value.toUpperCase())}
          className="border p-2 rounded w-32"
        />

        <input
          placeholder="GEO"
          value={geoFilter}
          onChange={(e) => setGeoFilter(e.target.value.toUpperCase())}
          className="border p-2 rounded w-24"
        />

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All Severity</option>
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
            onClick={() => exportCSV("csv")}
            className="bg-gray-800 text-white px-4 py-2 rounded"
          >
            Export CSV
          </button>

          <button
            onClick={() => exportCSV("xlsx")}
            className="bg-gray-800 text-white px-4 py-2 rounded"
          >
            Export XLSX
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <div>Total Alerts</div>
          <div className="text-2xl font-bold">{metrics.total}</div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div>High Severity</div>
          <div className="text-2xl font-bold">{metrics.high}</div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div>Unique IPs</div>
          <div className="text-2xl font-bold">{metrics.uniqueIps}</div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div>Top PUB</div>
          <div className="text-xl font-bold">
            {metrics.topPub || "—"} ({metrics.topPubCount})
          </div>
        </div>
      </div>

      {/* Charts + Live Feed */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-2 bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Alerts Trend</h3>
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={timeseries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="alerts"
                  stroke="#4F46E5"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Reasons Breakdown</h3>
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={reasonData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  label
                >
                  {reasonData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={COLORS[i % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table + Live Feed */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-3">Alerts Table</h3>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2">PUB</th>
                  <th className="p-2">IP</th>
                  <th className="p-2">Reason</th>
                  <th className="p-2">Severity</th>
                  <th className="p-2">Resolved</th>
                  <th className="p-2">Time</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="p-4 text-center">
                      Loading…
                    </td>
                  </tr>
                )}

                {!loading &&
                  alerts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center">
                        No alerts
                      </td>
                    </tr>
                  )}

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
                          Blacklist
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
          <h3 className="font-semibold mb-3">Live Feed</h3>

          <div className="space-y-2 max-h-[420px] overflow-y-auto text-xs">
            {liveFeed.map((l, i) => (
              <div key={i} className="p-2 border rounded">
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

                <div className="break-words text-xs">{l.ua}</div>
              </div>
            ))}

            {liveFeed.length === 0 && (
              <div className="text-gray-500">No recent alerts</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
