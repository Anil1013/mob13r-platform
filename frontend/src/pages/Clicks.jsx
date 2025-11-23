// frontend/src/pages/Clicks.jsx
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

  // fetch raw click rows (backend should return rows with created_at, pub_id, offer_id, ip, geo, carrier, click_id, ua)
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
      // expecting res.data = array of click rows
      setClicks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("fetchClicks error", err);
      setError(err?.response?.data?.error || err.message || "Failed to fetch");
      setClicks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // initial fetch
    fetchClicks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived metrics
  const metrics = useMemo(() => {
    const total = clicks.length;
    const uniqueIps = new Set(clicks.map((c) => c.ip)).size;
    const byPub = {};
    const byOffer = {};
    const byGeo = {};
    const byCarrier = {};

    clicks.forEach((c) => {
      const p = c.pub_id || c.publisher || "UNKNOWN";
      const o = c.offer_id || c.offer || "UNKNOWN";
      const g = (c.geo || "UNKNOWN").toUpperCase();
      const car = (c.carrier || "UNKNOWN").toUpperCase();

      byPub[p] = (byPub[p] || 0) + 1;
      byOffer[o] = (byOffer[o] || 0) + 1;
      byGeo[g] = (byGeo[g] || 0) + 1;
      byCarrier[car] = (byCarrier[car] || 0) + 1;
    });

    const topPub = Object.entries(byPub).sort((a, b) => b[1] - a[1])[0] || [null, 0];
    const topOffer = Object.entries(byOffer).sort((a, b) => b[1] - a[1])[0] || [null, 0];

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

  // Timeseries grouped hourly (client-side)
  const hourly = useMemo(() => {
    // Use created_at or createdAt; fall back to now
    const map = {};
    clicks.forEach((c) => {
      const dt = new Date(c.created_at || c.createdAt || Date.now());
      // Format: YYYY-MM-DD HH:00
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
    const arr = Object.entries(map)
      .map(([k, v]) => ({ hour: k, clicks: v }))
      .sort((a, b) => (a.hour > b.hour ? 1 : -1));
    return arr;
  }, [clicks]);

  // Geo pie chart data
  const geoData = useMemo(() => {
    return Object.entries(metrics.byGeo)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [metrics.byGeo]);

  // Offer breakdown for table
  const offersList = useMemo(() => {
    return Object.entries(metrics.byOffer)
      .map(([offerId, cnt]) => ({ offerId, cnt }))
      .sort((a, b) => b.cnt - a.cnt);
  }, [metrics.byOffer]);

  // export (csv or xlsx) using axios blob so token is attached
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

      const filenameParts = [
        "clicks",
        pub || "all",
        dateFrom ? dateFrom : "",
        dateTo ? dateTo : "",
      ].filter(Boolean);
      const ext = format === "xlsx" ? "xlsx" : "csv";
      const filename = `${filenameParts.join("_") || "clicks"}.${ext}`;

      saveBlob(res.data, filename);
    } catch (err) {
      console.error("exportClicks error", err);
      alert("Export failed: " + (err?.response?.data?.error || err.message));
    }
  };

  // simple UI utilities
  const resetFilters = () => {
    setPub("");
    setOffer("");
    setGeo("");
    setCarrier("");
    setDateFrom("");
    setDateTo("");
    setLimit(1000);
    setOffset(0);
    fetchClicks();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Clicks Analytics</h1>

      {/* Filters */}
      <div className="flex gap-3 items-center mb-4 flex-wrap">
        <input
          placeholder="Publisher (PUB03)"
          value={pub}
          onChange={(e) => setPub(e.target.value.toUpperCase())}
          className="border p-2 rounded w-40"
        />
        <input
          placeholder="Offer ID"
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
          className="border p-2 rounded w-40"
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
        <input type="number" value={limit} onChange={(e) => setLimit(Number(e.target.value || 100))} className="border p-2 rounded w-24" />
        <button onClick={fetchClicks} className="bg-blue-600 text-white px-3 py-2 rounded">Apply</button>
        <button onClick={resetFilters} className="bg-gray-200 px-3 py-2 rounded">Reset</button>

        <div className="ml-auto flex gap-2">
          <button onClick={() => exportClicks("csv")} className="bg-gray-800 text-white px-3 py-2 rounded">Export CSV</button>
          <button onClick={() => exportClicks("xlsx")} className="bg-gray-800 text-white px-3 py-2 rounded">Export XLSX</button>
        </div>
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
          <div className="text-2xl font-semibold">{metrics.topPub || "—"} <span className="text-sm">({metrics.topPubCount})</span></div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Top Offer</div>
          <div className="text-2xl font-semibold">{metrics.topOffer || "—"} <span className="text-sm">({metrics.topOfferCount})</span></div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-2 bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Clicks (hourly)</h3>
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

        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Top GEOs</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={geoData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {geoData.map((entry, index) => (
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

      {/* Table + side summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white p-4 rounded shadow">
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
                {loading && <tr><td colSpan={7} className="p-4 text-center">Loading…</td></tr>}
                {!loading && clicks.length === 0 && <tr><td colSpan={7} className="p-4 text-center">No clicks</td></tr>}
                {!loading && clicks.map((c) => (
                  <tr key={c.click_id || c.id || Math.random()} className="border-t">
                    <td className="p-2">{new Date(c.created_at || c.createdAt || Date.now()).toLocaleString()}</td>
                    <td className="p-2">{c.pub_id || c.publisher || "—"}</td>
                    <td className="p-2">{c.offer_id || c.offer || "—"}</td>
                    <td className="p-2 font-mono">{c.ip}</td>
                    <td className="p-2">{(c.geo || "").toUpperCase() || "—"}</td>
                    <td className="p-2">{c.carrier || "—"}</td>
                    <td className="p-2 font-mono">{c.click_id || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Summary</h3>
          <div className="text-sm mb-2"><strong>By Offer</strong></div>
          <div className="space-y-1 mb-4 max-h-[320px] overflow-y-auto">
            {offersList.length === 0 && <div className="text-gray-500">No offers</div>}
            {offersList.map((o) => (
              <div key={o.offerId} className="flex justify-between text-xs">
                <div className="truncate pr-2">{o.offerId}</div>
                <div className="font-semibold">{o.cnt}</div>
              </div>
            ))}
          </div>

          <div className="text-sm mb-2"><strong>By Carrier</strong></div>
          <div className="space-y-1 text-xs">
            {Object.entries(metrics.byCarrier).length === 0 && <div className="text-gray-500">No carriers</div>}
            {Object.entries(metrics.byCarrier).map(([k, v]) => (
              <div key={k} className="flex justify-between"><div className="truncate pr-2">{k}</div><div>{v}</div></div>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="mt-4 text-red-600">Error: {error}</div>}
    </div>
  );
}
