import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient";
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

const COLORS = [
  "#4F46E5",
  "#EF4444",
  "#10B981",
  "#F59E0B",
  "#06B6D4",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
];

export default function ClickAnalytics() {
  const [loading, setLoading] = useState(false);
  const [clicks, setClicks] = useState([]);
  const [latest, setLatest] = useState([]);

  const [pub, setPub] = useState("");
  const [geo, setGeo] = useState("");
  const [carrier, setCarrier] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchClicks = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (pub) params.append("pub_id", pub);
      if (geo) params.append("geo", geo);
      if (carrier) params.append("carrier", carrier);
      if (dateFrom) params.append("from", dateFrom);
      if (dateTo) params.append("to", dateTo);

      const res = await apiClient.get(`/analytics/clicks?${params.toString()}`);

      setClicks(res.data || []);
      setLatest((res.data || []).slice(0, 20));
    } catch (err) {
      console.log("clicks error", err);
      setClicks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClicks();
    const iv = setInterval(fetchClicks, 20000);
    return () => clearInterval(iv);
  }, []);

  // ---------------------------
  // METRICS
  // ---------------------------

  const metrics = useMemo(() => {
    return {
      total: clicks.length,
      uniquePub: new Set(clicks.map((c) => c.pub_id)).size,
      uniqueGeo: new Set(clicks.map((c) => c.geo)).size,
      uniqueCarrier: new Set(clicks.map((c) => c.carrier)).size,
    };
  }, [clicks]);

  // ---------------------------
  // HOURLY GRAPH
  // ---------------------------
  const hourlyData = useMemo(() => {
    const map = {};
    clicks.forEach((c) => {
      const d = new Date(c.created_at);
      const hour = d.getHours().toString().padStart(2, "0");
      map[hour] = (map[hour] || 0) + 1;
    });

    return Object.entries(map).map(([h, v]) => ({
      hour: `${h}:00`,
      clicks: v,
    }));
  }, [clicks]);

  // ---------------------------
  // GEO PIE
  // ---------------------------
  const geoPie = useMemo(() => {
    const map = {};
    clicks.forEach((c) => {
      const g = c.geo || "Unknown";
      map[g] = (map[g] || 0) + 1;
    });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [clicks]);

  // ---------------------------
  // CARRIER PIE
  // ---------------------------
  const carrierPie = useMemo(() => {
    const map = {};
    clicks.forEach((c) => {
      const op = c.carrier || "Unknown";
      map[op] = (map[op] || 0) + 1;
    });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [clicks]);

  // ---------------------------
  // EXPORT CSV / XLSX
  // ---------------------------
  const exportData = (format = "csv") => {
    const params = new URLSearchParams();
    if (pub) params.append("pub_id", pub);
    if (geo) params.append("geo", geo);
    if (carrier) params.append("carrier", carrier);
    if (dateFrom) params.append("from", dateFrom);
    if (dateTo) params.append("to", dateTo);
    params.append("format", format);

    const token = localStorage.getItem("mob13r_token");

    const finalURL = `${apiClient.defaults.baseURL}/analytics/clicks/export?${params.toString()}&token=${token}`;

    window.open(finalURL, "_blank");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Click Analytics</h1>

      {/* ---------------- Filters ---------------- */}
      <div className="flex gap-3 mb-4 items-center">
        <input
          placeholder="PUB ID"
          className="border p-2 rounded w-32"
          value={pub}
          onChange={(e) => setPub(e.target.value.toUpperCase())}
        />

        <input
          placeholder="GEO"
          className="border p-2 rounded w-24"
          value={geo}
          onChange={(e) => setGeo(e.target.value.toUpperCase())}
        />

        <input
          placeholder="Carrier"
          className="border p-2 rounded w-32"
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
        />

        <input
          type="date"
          className="border p-2 rounded"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />

        <input
          type="date"
          className="border p-2 rounded"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />

        <button
          onClick={fetchClicks}
          className="bg-blue-600 text-white px-3 py-2 rounded"
        >
          Apply
        </button>

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => exportData("csv")}
            className="bg-gray-800 text-white px-3 py-2 rounded"
          >
            Export CSV
          </button>
          <button
            onClick={() => exportData("xlsx")}
            className="bg-gray-800 text-white px-3 py-2 rounded"
          >
            Export XLSX
          </button>
        </div>
      </div>

      {/* ---------------- Metrics Cards ---------------- */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Total Clicks</div>
          <div className="text-2xl font-semibold">{metrics.total}</div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Unique PUB</div>
          <div className="text-2xl font-semibold">{metrics.uniquePub}</div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Unique GEO</div>
          <div className="text-2xl font-semibold">{metrics.uniqueGeo}</div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Unique Carrier</div>
          <div className="text-2xl font-semibold">{metrics.uniqueCarrier}</div>
        </div>
      </div>

      {/* ---------------- Charts ---------------- */}
      <div className="grid grid-cols-3 gap-6">
        {/* HOURLY CHART */}
        <div className="col-span-2 bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Hourly Clicks</h3>
          <div style={{ height: 250 }}>
            <ResponsiveContainer>
              <LineChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="clicks"
                  stroke="#4F46E5"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GEO PIE */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">GEO Breakdown</h3>
          <div style={{ height: 250 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={geoPie}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  label
                >
                  {geoPie.map((e, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ---------------- Table + Live Feed ---------------- */}
      <div className="grid grid-cols-3 gap-6 mt-6">
        {/* TABLE */}
        <div className="col-span-2 bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Clicks Table</h3>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2">PUB</th>
                  <th className="p-2">GEO</th>
                  <th className="p-2">Carrier</th>
                  <th className="p-2">IP</th>
                  <th className="p-2">Click ID</th>
                  <th className="p-2">Time</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="text-center p-4">
                      Loading...
                    </td>
                  </tr>
                )}

                {!loading &&
                  clicks.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="p-2">{c.pub_id}</td>
                      <td className="p-2">{c.geo}</td>
                      <td className="p-2">{c.carrier}</td>
                      <td className="p-2">{c.ip}</td>
                      <td className="p-2">{c.click_id}</td>
                      <td className="p-2">
                        {new Date(c.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* LIVE FEED */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Recent Clicks</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto text-xs">
            {latest.map((c) => (
              <div key={c.id} className="p-2 border rounded">
                <div className="flex justify-between">
                  <span className="font-mono">{c.ip}</span>
                  <span className="text-gray-500">
                    {new Date(c.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div>
                  <strong>{c.pub_id}</strong> — {c.geo} ({c.carrier})
                </div>
                <div className="break-words text-gray-600">{c.ua}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
