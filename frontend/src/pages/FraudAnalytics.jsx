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

// Color palette
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

  // Build params object for list & export
  const buildParams = () => {
    const p = {};
    if (pubFilter) p.pub_id = pubFilter;
    if (geoFilter) p.geo = geoFilter;
    if (severityFilter) p.severity = severityFilter;
    if (dateFrom) p.from = dateFrom;
    if (dateTo) p.to = dateTo;
    if (limit) p.limit = limit;
    return p;
  };

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = buildParams();
      const res = await apiClient.get("/fraud/alerts", { params });
      const rows = res.data || [];
      setAlerts(rows);
      setLiveFeed(rows.slice(0, 20));
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
    const iv = setInterval(fetchAlerts, 20000); // poll every 20s
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived metrics
  const metrics = useMemo(() => {
    const total = alerts.length;
    const high = alerts.filter((a) => (a.severity || "").toLowerCase() === "high").length;
    const uniqueIps = new Set(alerts.map((a) => a.ip)).size;
    const byPub = {};
    alerts.forEach((a) => {
      byPub[a.pub_id] = (byPub[a.pub_id] || 0) + 1;
    });
    const top = Object.entries(byPub).sort((a, b) => b[1] - a[1])[0] || [null, 0];
    return { total, high, uniqueIps, topPub: top[0], topPubCount: top[1] };
  }, [alerts]);

  // Timeseries (alerts per day)
  const timeseries = useMemo(() => {
    const map = {};
    alerts.forEach((a) => {
      const d = new Date(a.created_at || a.createdAt || Date.now());
      if (isNaN(d)) return;
      const key = d.toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, alerts]) => ({ date, alerts }));
  }, [alerts]);

  // Reason breakdown
  const reasonData = useMemo(() => {
    const map = {};
    alerts.forEach((a) => {
      const r = a.reason || "unknown";
      map[r] = (map[r] || 0) + 1;
    });
    return Object.entries(map)
      .slice(0, 12)
      .map(([name, value]) => ({ name, value }));
  }, [alerts]);

  // Actions
  const resolveAlert = async (id) => {
    try {
      await apiClient.post(`/fraud/alerts/${id}/resolve`, {
        resolved_by: localStorage.getItem("mob13r_admin") || "ui",
      });
      fetchAlerts();
    } catch (err) {
      console.error("resolveAlert error", err);
      alert("Resolve failed");
    }
  };

  const whitelistPub = async (pub) => {
    try {
      if (!pub) return alert("No PUB ID");
      await apiClient.post("/fraud/whitelist", {
        pub_id: pub,
        note: "From analytics UI",
        created_by: localStorage.getItem("mob13r_admin_id") || null,
      });
      alert("Whitelisted");
      fetchAlerts();
    } catch (err) {
      console.error("whitelistPub error", err);
      alert("Whitelist failed");
    }
  };

  const blacklistIp = async (ip) => {
    try {
      if (!ip) return alert("No IP");
      await apiClient.post("/fraud/blacklist", {
        ip,
        note: "From analytics UI",
        created_by: localStorage.getItem("mob13r_admin_id") || null,
      });
      alert("Blacklisted");
      fetchAlerts();
    } catch (err) {
      console.error("blacklistIp error", err);
      alert("Blacklist failed");
    }
  };

  // Export handler — uses apiClient to include Authorization header and fetch blob
  const exportFile = async (format = "csv") => {
    try {
      const params = buildParams();
      params.format = format;

      // We use axios (apiClient) with responseType blob so token header is included
      const res = await apiClient.get("/fraud/export", {
        params,
        responseType: "blob",
        timeout: 60000,
      });

      // Determine filename from content-disposition if present
      let filename = `fraud_alerts_${params.pub_id || "all"}.${format === "xlsx" ? "xlsx" : "csv"}`;
      const cd = res.headers && (res.headers["content-disposition"] || res.headers["Content-Disposition"]);
      if (cd) {
        const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(cd);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, "");
        }
      }

      const blob = new Blob([res.data], { type: res.data.type || (format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv") });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("exportFile error", err);
      // If backend returned JSON error as blob, try to read and show it
      if (err?.response?.data) {
        try {
          const text = await err.response.data.text();
          console.warn("export error payload:", text);
          alert("Export failed: " + (text || err.message));
        } catch {
          alert("Export failed");
        }
      } else {
        alert("Export failed");
      }
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Fraud Analytics Dashboard</h1>

      {/* Filters */}
      <div className="flex gap-3 items-center mb-4">
        <input
          placeholder="PUB (e.g. PUB03)"
          value={pubFilter}
          onChange={(e) => setPubFilter(e.target.value.toUpperCase())}
          className="border p-2 rounded w-40"
        />
        <input
          placeholder="GEO (IN)"
          value={geoFilter}
          onChange={(e) => setGeoFilter(e.target.value.toUpperCase())}
          className="border p-2 rounded w-28"
        />
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All severities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border p-2 rounded" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border p-2 rounded" />

        <button onClick={fetchAlerts} className="bg-blue-600 text-white px-3 py-2 rounded">
          Apply
        </button>

        <div className="ml-auto flex gap-2">
          <button onClick={() => exportFile("csv")} className="bg-gray-800 text-white px-3 py-2 rounded">
            Export CSV
          </button>
          <button onClick={() => exportFile("xlsx")} className="bg-gray-800 text-white px-3 py-2 rounded">
            Export XLSX
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Total Alerts</div>
          <div className="text-2xl font-semibold">{metrics.total}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">High Severity</div>
          <div className="text-2xl font-semibold">{metrics.high}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Unique IPs</div>
          <div className="text-2xl font-semibold">{metrics.uniqueIps}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Top PUB</div>
          <div className="text-2xl font-semibold">
            {metrics.topPub || "—"} <span className="text-sm">({metrics.topPubCount})</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-2 bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Alerts (time series)</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={timeseries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="alerts" stroke="#4F46E5" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Reasons breakdown</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={reasonData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {reasonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table + live feed */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Alerts Table</h3>
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
                {!loading && alerts.length === 0 && (
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
                      <td className="p-2">{new Date(a.created_at).toLocaleString()}</td>
                      <td className="p-2 flex gap-2">
                        {!a.resolved && (
                          <button onClick={() => resolveAlert(a.id)} className="bg-green-600 text-white px-2 py-1 rounded text-xs">
                            Resolve
                          </button>
                        )}
                        <button onClick={() => whitelistPub(a.pub_id)} className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
                          Whitelist
                        </button>
                        <button onClick={() => blacklistIp(a.ip)} className="bg-red-600 text-white px-2 py-1 rounded text-xs">
                          Blacklist IP
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Live Feed (recent)</h3>
          <div className="space-y-2 max-h-[420px] overflow-y-auto text-xs">
            {liveFeed.map((l, idx) => (
              <div key={l.id || idx} className="p-2 border rounded">
                <div className="flex justify-between">
                  <div className="font-mono">{l.ip}</div>
                  <div className="text-gray-500">{new Date(l.created_at).toLocaleTimeString()}</div>
                </div>
                <div className="text-sm">
                  <strong>{l.pub_id}</strong> — {l.reason} <span className="text-gray-500">({l.severity})</span>
                </div>
                <div className="break-words text-xs text-gray-700">{l.ua}</div>
              </div>
            ))}
            {liveFeed.length === 0 && <div className="text-gray-500">No recent alerts</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
