// mob13r-platform/frontend/src/pages/Clicks.jsx
import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["#4F46E5", "#EF4444", "#F59E0B", "#10B981", "#06B6D4", "#8B5CF6"];

function saveBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default function Clicks() {
  const [loading, setLoading] = useState(false);
  const [clicks, setClicks] = useState([]);
  const [pub, setPub] = useState("");
  const [offer, setOffer] = useState("");
  const [geo, setGeo] = useState("");
  const [carrier, setCarrier] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [limit, setLimit] = useState(1000);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");

  // Fetch click logs
  const fetchClicks = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};
      if (pub) params.pub_id = pub;
      if (offer) params.offer_id = offer;
      if (geo) params.geo = geo;
      if (carrier) params.carrier = carrier;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      params.limit = limit;
      params.offset = offset;

      const res = await apiClient.get("/analytics/clicks", { params });
      setClicks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("fetchClicks error", err);
      setError(err?.response?.data?.error || "Failed to fetch clicks");
      setClicks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClicks();
  }, []);

  // Metrics
  const metrics = useMemo(() => {
    const total = clicks.length;
    const uniqueIps = new Set(clicks.map((c) => c.ip)).size;

    const byPub = {};
    const byOffer = {};
    const byGeo = {};
    const byCarrier = {};

    clicks.forEach((c) => {
      const p = c.pub_id || "UNKNOWN";
      const o = c.offer_id || "UNKNOWN";
      const g = (c.geo || "UNKNOWN").toUpperCase();
      const car = (c.carrier || "UNKNOWN").toUpperCase();

      byPub[p] = (byPub[p] || 0) + 1;
      byOffer[o] = (byOffer[o] || 0) + 1;
      byGeo[g] = (byGeo[g] || 0) + 1;
      byCarrier[car] = (byCarrier[car] || 0) + 1;
    });

    const topPub = Object.entries(byPub).sort((a, b) => b[1] - a[1])[0] || [];
    const topOffer = Object.entries(byOffer).sort((a, b) => b[1] - a[1])[0] || [];

    return {
      total,
      uniqueIps,
      topPub: topPub[0],
      topPubCount: topPub[1],
      topOffer: topOffer[0],
      topOfferCount: topOffer[1],
      byGeo,
      byCarrier,
      byOffer,
      byPub,
    };
  }, [clicks]);

  // Hourly timeseries
  const hourly = useMemo(() => {
    const map = {};
    clicks.forEach((c) => {
      const dt = new Date(c.created_at || Date.now());
      const key =
        dt.getFullYear() +
        "-" +
        String(dt.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(dt.getDate()).padStart(2, "0") +
        " " +
        String(dt.getHours()).padStart(2, "0") +
        ":00";

      map[key] = (map[key] || 0) + 1;
    });

    return Object.entries(map)
      .map(([hour, clicks]) => ({ hour, clicks }))
      .sort((a, b) => (a.hour > b.hour ? 1 : -1));
  }, [clicks]);

  // GEO pie data
  const geoData = useMemo(
    () =>
      Object.entries(metrics.byGeo)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
    [metrics.byGeo]
  );

  // Export CSV/XLSX
  const exportClicks = async (format = "csv") => {
    try {
      const params = {};
      if (pub) params.pub_id = pub;
      if (offer) params.offer_id = offer;
      if (geo) params.geo = geo;
      if (carrier) params.carrier = carrier;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      params.format = format;

      const res = await apiClient.get("/analytics/clicks/export", {
        params,
        responseType: "blob",
      });

      saveBlob(res.data, `clicks.${format}`);
    } catch (err) {
      console.error("exportClicks error", err);
      alert("Export failed");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Clicks Analytics</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <input
          placeholder="Publisher"
          value={pub}
          onChange={(e) => setPub(e.target.value.toUpperCase())}
          className="border p-2 rounded w-36"
        />
        <input
          placeholder="Offer ID"
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
          className="border p-2 rounded w-36"
        />
        <input
          placeholder="GEO (IN)"
          value={geo}
          onChange={(e) => setGeo(e.target.value.toUpperCase())}
          className="border p-2 rounded w-28"
        />
        <input
          placeholder="Carrier"
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          className="border p-2 rounded w-36"
        />
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border p-2 rounded" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border p-2 rounded" />
        <button onClick={fetchClicks} className="bg-blue-600 text-white px-3 py-2 rounded">
          Apply
        </button>

        <button onClick={() => exportClicks("csv")} className="bg-gray-800 text-white px-3 py-2 rounded ml-auto">
          CSV
        </button>
        <button onClick={() => exportClicks("xlsx")} className="bg-gray-800 text-white px-3 py-2 rounded">
          XLSX
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Total Clicks</div>
          <div className="text-2xl font-semibold">{metrics.total}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Unique IPs</div>
          <div className="text-2xl font-semibold">{metrics.uniqueIps}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Top Publisher</div>
          <div className="text-xl font-semibold">{metrics.topPub || "—"}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Top Offer</div>
          <div className="text-xl font-semibold">{metrics.topOffer || "—"}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Hourly */}
        <div className="col-span-2 bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Clicks (Hourly)</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={hourly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="clicks" stroke="#4F46E5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GEO Pie */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Top GEOs</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={geoData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {geoData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">Clicks Table</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">Time</th>
                <th className="p-2">Publisher</th>
                <th className="p-2">Offer</th>
                <th className="p-2">IP</th>
                <th className="p-2">GEO</th>
                <th className="p-2">Carrier</th>
                <th className="p-2">Click ID</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="p-4 text-center">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading &&
                clicks.map((c) => (
                  <tr key={c.click_id || Math.random()} className="border-t">
                    <td className="p-2">{new Date(c.created_at).toLocaleString()}</td>
                    <td className="p-2">{c.pub_id}</td>
                    <td className="p-2">{c.offer_id}</td>
                    <td className="p-2 font-mono">{c.ip}</td>
                    <td className="p-2">{c.geo}</td>
                    <td className="p-2">{c.carrier}</td>
                    <td className="p-2 font-mono">{c.click_id}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && <div className="mt-4 text-red-600">Error: {error}</div>}
    </div>
  );
}
