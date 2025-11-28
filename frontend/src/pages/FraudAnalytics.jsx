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
  BarChart,
  Bar,
} from "recharts";
import apiClient from "../api/apiClient";

// Color palette
const COLORS = ["#4F46E5", "#EF4444", "#F59E0B", "#10B981", "#06B6D4", "#8B5CF6"];

const todayStr = new Date().toISOString().slice(0, 10);

export default function FraudAnalytics() {
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [liveFeed, setLiveFeed] = useState([]);

  const [pubFilter, setPubFilter] = useState("");
  const [geoFilter, setGeoFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [dateFrom, setDateFrom] = useState(todayStr);
  const [dateTo, setDateTo] = useState(todayStr);
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

  // Initial load + polling for live view
  useEffect(() => {
    fetchAlerts();
    const iv = setInterval(fetchAlerts, 20000); // poll every 20s
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------
  // Derived metrics (AI-style)
  // ---------------------------------
  const metrics = useMemo(() => {
    const total = alerts.length;
    const high = alerts.filter(
      (a) => (a.severity || "").toLowerCase() === "high"
    ).length;
    const medium = alerts.filter(
      (a) => (a.severity || "").toLowerCase() === "medium"
    ).length;
    const low = alerts.filter(
      (a) => (a.severity || "").toLowerCase() === "low"
    ).length;

    const uniqueIps = new Set(alerts.map((a) => a.ip)).size;

    const byPub = {};
    alerts.forEach((a) => {
      const k = a.pub_id || "UNKNOWN";
      byPub[k] = (byPub[k] || 0) + 1;
    });
    const sortedPub = Object.entries(byPub).sort((a, b) => b[1] - a[1]);
    const topPub = sortedPub[0]?.[0] || null;
    const topPubCount = sortedPub[0]?.[1] || 0;

    return { total, high, medium, low, uniqueIps, topPub, topPubCount };
  }, [alerts]);

  // Timeseries (alerts per day)
  const timeseries = useMemo(() => {
    const map = {};
    alerts.forEach((a) => {
      const d = new Date(a.created_at || a.createdAt || Date.now());
      if (Number.isNaN(d.getTime())) return;
      const key = d.toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, alerts]) => ({ date, alerts }));
  }, [alerts]);

  // Reason breakdown (for pie)
  const reasonData = useMemo(() => {
    const map = {};
    alerts.forEach((a) => {
      const r = a.reason || "unknown";
      map[r] = (map[r] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, value]) => ({ name, value }));
  }, [alerts]);

  // GEO breakdown
  const geoStats = useMemo(() => {
    const map = {};
    alerts.forEach((a) => {
      const g = (a.geo || "UNKNOWN").toUpperCase();
      map[g] = (map[g] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([geo, value]) => ({ geo, value }));
  }, [alerts]);

  // PUB risk ranking (AI-style score)
  const pubRiskList = useMemo(() => {
    const map = {};
    alerts.forEach((a) => {
      const k = a.pub_id || "UNKNOWN";
      if (!map[k]) {
        map[k] = { pub_id: k, total: 0, high: 0, medium: 0, low: 0 };
      }
      map[k].total += 1;
      const sev = (a.severity || "").toLowerCase();
      if (sev === "high") map[k].high += 1;
      else if (sev === "medium") map[k].medium += 1;
      else map[k].low += 1;
    });

    return Object.values(map)
      .map((row) => {
        // Simple AI-like risk formula
        const riskScore = Math.min(
          100,
          row.high * 5 + row.medium * 2 + row.total * 0.5
        );
        return { ...row, riskScore };
      })
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 8);
  }, [alerts]);

  // AI narrative summary
  const aiSummary = useMemo(() => {
    if (!alerts.length) {
      return "No alerts in the selected range. Traffic currently looks clean and stable.";
    }

    const { total, high, medium, uniqueIps, topPub, topPubCount } = metrics;
    const topGeo = geoStats[0]?.geo;
    const totalHighPct = ((high / total) * 100).toFixed(1);
    const totalMediumPct = ((medium / total) * 100).toFixed(1);

    let parts = [];

    parts.push(
      `Analysed ${total} fraud alerts across ${uniqueIps} unique IPs in the selected time window.`
    );

    if (high > 0) {
      parts.push(
        `${high} (${totalHighPct}%) alerts are HIGH severity, indicating active suspicious activity.`
      );
    } else if (medium > 0) {
      parts.push(
        `No HIGH severity alerts, but ${medium} (${totalMediumPct}%) alerts are MEDIUM severity and should be monitored.`
      );
    } else {
      parts.push(
        `All alerts are LOW severity – behaviour appears mostly safe, but still monitored.`
      );
    }

    if (topPub && topPubCount > 0) {
      parts.push(
        `PUB ${topPub} has the highest concentration with ${topPubCount} alerts.`
      );
    }

    if (topGeo && topGeo !== "UNKNOWN") {
      parts.push(
        `Most suspicious clicks originate from GEO ${topGeo}, consider tightening filters for this region.`
      );
    }

    return parts.join(" ");
  }, [alerts, metrics, geoStats]);

  // ---------------------------------
  // Actions
  // ---------------------------------
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

  // Export handler
  const exportFile = async (format = "csv") => {
    try {
      const params = buildParams();
      params.format = format;

      const res = await apiClient.get("/fraud/export", {
        params,
        responseType: "blob",
        timeout: 60000,
      });

      let filename = `fraud_alerts_${params.pub_id || "all"}.${
        format === "xlsx" ? "xlsx" : "csv"
      }`;
      const cd =
        res.headers &&
        (res.headers["content-disposition"] ||
          res.headers["Content-Disposition"]);
      if (cd) {
        const match =
          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(cd);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, "");
        }
      }

      const blob = new Blob([res.data], {
        type:
          res.data.type ||
          (format === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "text/csv"),
      });
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

  // ---------------------------------
  // RENDER
  // ---------------------------------
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">Fraud Analytics (AI Mode)</h1>
      <p className="text-sm text-gray-500 mb-4">
        Real-time fraud intelligence across publishers, GEOs, and IPs – powered
        by your fraudCheck v2.0 engine.
      </p>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center mb-4">
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

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="border p-2 rounded"
        />
        <span>to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="border p-2 rounded"
        />

        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value) || 500)}
          className="border p-2 rounded"
        >
          <option value={200}>200</option>
          <option value={500}>500</option>
          <option value={1000}>1000</option>
        </select>

        <button
          onClick={fetchAlerts}
          className="bg-blue-600 text-white px-3 py-2 rounded"
        >
          Apply
        </button>

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => exportFile("csv")}
            className="bg-gray-800 text-white px-3 py-2 rounded text-sm"
          >
            Export CSV
          </button>
          <button
            onClick={() => exportFile("xlsx")}
            className="bg-gray-800 text-white px-3 py-2 rounded text-sm"
          >
            Export XLSX
          </button>
        </div>
      </div>

      {/* AI Summary + Metric cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="col-span-2 bg-white p-4 rounded shadow">
          <div className="text-xs font-semibold text-indigo-600 mb-1">
            AI Insight
          </div>
          <div className="text-sm text-gray-700 leading-relaxed">
            {aiSummary}
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Total Alerts</div>
          <div className="text-2xl font-semibold">{metrics.total}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">High / Medium / Low</div>
          <div className="text-lg font-semibold">
            {metrics.high} / {metrics.medium} / {metrics.low}
          </div>
          <div className="text-xs text-gray-400">
            Unique IPs: {metrics.uniqueIps}
          </div>
          <div className="text-xs text-gray-400">
            Top PUB: {metrics.topPub || "—"} ({metrics.topPubCount || 0})
          </div>
        </div>
      </div>

      {/* Charts row: timeseries + reason pie + geo bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Timeseries */}
        <div className="col-span-2 bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Alerts over time</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={timeseries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="alerts"
                  stroke="#4F46E5"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Reasons pie */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Reasons breakdown</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={reasonData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  label
                >
                  {reasonData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* PUB risk ranking + GEO breakdown */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* PUB risk */}
        <div className="col-span-2 bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Publisher Risk Ranking</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={pubRiskList}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="pub_id" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="riskScore">
                  {pubRiskList.map((entry, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            RiskScore is an internal heuristic combining high/medium alerts and
            total volume (0–100).
          </p>
        </div>

        {/* GEO table */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Top GEOs</h3>
          <div className="max-h-64 overflow-y-auto text-sm">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-1 text-left">GEO</th>
                  <th className="p-1 text-right">Alerts</th>
                </tr>
              </thead>
              <tbody>
                {geoStats.map((g) => (
                  <tr key={g.geo} className="border-t">
                    <td className="p-1">{g.geo}</td>
                    <td className="p-1 text-right">{g.value}</td>
                  </tr>
                ))}
                {geoStats.length === 0 && (
                  <tr>
                    <td
                      colSpan={2}
                      className="p-2 text-center text-gray-400"
                    >
                      No data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Table + live feed */}
      <div className="grid grid-cols-3 gap-4">
        {/* Alerts Table */}
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
                      <td className="p-2">
                        {a.resolved ? "Yes" : "No"}
                      </td>
                      <td className="p-2">
                        {new Date(a.created_at).toLocaleString()}
                      </td>
                      <td className="p-2 flex flex-wrap gap-1">
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
                          Blacklist IP
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
          <h3 className="font-semibold mb-2">Live Feed (recent)</h3>
          <div className="space-y-2 max-h-[420px] overflow-y-auto text-xs">
            {liveFeed.map((l, idx) => (
              <div
                key={l.id || idx}
                className="p-2 border rounded bg-gray-50"
              >
                <div className="flex justify-between">
                  <div className="font-mono">{l.ip}</div>
                  <div className="text-gray-500">
                    {new Date(l.created_at).toLocaleTimeString()}
                  </div>
                </div>
                <div className="text-sm">
                  <strong>{l.pub_id}</strong> — {l.reason}{" "}
                  <span className="text-gray-500">
                    ({l.severity || "unknown"})
                  </span>
                </div>
                <div className="break-words text-[11px] text-gray-700">
                  {l.ua}
                </div>
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
