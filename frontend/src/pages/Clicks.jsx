import React, { useEffect, useMemo, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card"; // optional shadcn usage
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Save } from "lucide-react";
import * as XLSX from "xlsx";

// Clicks.jsx
// - Fetches /api/analytics/clicks with many params
// - Shows table with sortable columns, pagination, CSV/XLSX export
// - Hourly/Daily grouped chart using recharts
// - Auto-refresh every 5 seconds (configurable)
// - Centers data under headings and includes pub_code, offer_code, publisher_name, offer_name, advertiser_name
// - Uses Tailwind CSS classes (already present in project)
//
// Developer note: sample screenshot used in UI preview (local):
// sandbox:/mnt/data/0d8fd630-7725-4b8c-b6b7-d05f549a284b.png

export default function ClicksAnalytics() {
  const [filters, setFilters] = useState({
    pub: "",
    offer: "",
    geo: "",
    carrier: "",
    from: "",
    to: "",
    search: "",
    group: "none",
    limit: 200,
    offset: 0,
    format: "json",
  });

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sort, setSort] = useState({ key: "created_at", dir: "desc" });
  const [totalClicks, setTotalClicks] = useState(0);
  const [topPublisher, setTopPublisher] = useState(null);
  const [topOffer, setTopOffer] = useState(null);
  const intervalRef = useRef(null);

  // Build query string from filters
  const buildUrl = () => {
    const params = new URLSearchParams();
    if (filters.pub) params.set("pub_id", filters.pub);
    if (filters.offer) params.set("offer", filters.offer);
    if (filters.geo) params.set("geo", filters.geo);
    if (filters.carrier) params.set("carrier", filters.carrier);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.group) params.set("group", filters.group);
    if (filters.limit) params.set("limit", filters.limit);
    if (filters.offset) params.set("offset", filters.offset);
    if (filters.format) params.set("format", filters.format);
    if (filters.search) params.set("q", filters.search);
    return `/api/analytics/clicks?${params.toString()}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const url = buildUrl();
      const res = await fetch(url);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();

      // If CSV/XLSX format requested, backend may return text. But for this UI we expect JSON array rows
      const rows = Array.isArray(json) ? json : json.rows || [];
      setData(rows.map(normalizeRow));

      // compute totals and tops
      setTotalClicks(rows.length);
      computeTops(rows);
    } catch (err) {
      console.error("Failed to fetch clicks:", err);
    } finally {
      setLoading(false);
    }
  };

  // normalize DB row to consistent keys used by UI
  const normalizeRow = (r) => {
    return {
      id: r.id || r.click_id || null,
      created_at: r.click_time || r.created_at || r.time || r.ts,
      pub_code: r.pub_code || r.pub_id || r.pub || r.publisher_code || r.pub_code,
      pub: r.pub_id || r.pub || r.pub_code || r.publisher_id,
      publisher_name: r.publisher_name || r.publisher || r.pub_name || r.publisher_name,
      offer_id: r.offer_id || r.offer || r.offer_code || r.offer_id,
      offer_code: r.offer_code || r.offer || r.offer_id || r.offer_code,
      offer_name: r.offer_name || r.offer || r.offer_title || r.offer_name,
      advertiser_name: r.advertiser_name || r.advertiser || r.adv_name || r.advertiser_name,
      ip: r.ip || r.client_ip || r.remote_ip,
      click_id: r.click_id || r.clickId || r.id || r.click_id,
      geo: r.geo || r.country,
      carrier: r.carrier || r.operator,
      ua: r.ua || r.user_agent || r.userAgent,
      referer: r.referer || r.referrer,
      // keep original row for exports if needed
      raw: r,
    };
  };

  const computeTops = (rows) => {
    const pubCount = {};
    const offerCount = {};
    rows.forEach((r) => {
      const pub = r.pub || r.pub_code || r.publisher_name || "-";
      const offer = r.offer_id || r.offer_code || r.offer_name || "-";
      pubCount[pub] = (pubCount[pub] || 0) + 1;
      offerCount[offer] = (offerCount[offer] || 0) + 1;
    });

    const topP = Object.entries(pubCount).sort((a, b) => b[1] - a[1])[0];
    const topO = Object.entries(offerCount).sort((a, b) => b[1] - a[1])[0];
    setTopPublisher(topP ? `${topP[0]} (${topP[1]})` : "—");
    setTopOffer(topO ? `${topO[0]} (${topO[1]})` : "—");
  };

  // sorting helper
  const sortedData = useMemo(() => {
    const arr = [...data];
    const { key, dir } = sort;
    arr.sort((a, b) => {
      const A = a[key] ?? "";
      const B = b[key] ?? "";
      if (A === B) return 0;
      if (dir === "asc") return A > B ? 1 : -1;
      return A < B ? 1 : -1;
    });
    return arr;
  }, [data, sort]);

  // grouped data for chart (by hour/day) - expects created_at to be ISO or parseable
  const grouped = useMemo(() => {
    if (!data.length) return [];
    const map = {};
    data.forEach((r) => {
      const d = new Date(r.created_at);
      if (isNaN(d)) return;
      let key;
      if (filters.group === "hour") {
        key = d.toISOString().slice(0, 13).replace("T", " ") + ":00"; // yyyy-mm-dd hh:00
      } else if (filters.group === "day") {
        key = d.toISOString().slice(0, 10); // yyyy-mm-dd
      } else {
        key = d.toISOString();
      }
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([k, v]) => ({ time: k, clicks: v })).sort((a, b) => a.time.localeCompare(b.time));
  }, [data, filters.group]);

  // Auto-refresh logic
  useEffect(() => {
    fetchData();
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchData, 5000);
    }
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.group, filters.limit, filters.offset]);

  // toggle sorting
  const toggleSort = (key) => {
    if (sort.key === key) {
      setSort({ key, dir: sort.dir === "asc" ? "desc" : "asc" });
    } else {
      setSort({ key, dir: "asc" });
    }
  };

  // Export helpers
  const exportCSV = () => {
    const headers = [
      "time",
      "pub_code",
      "publisher_name",
      "offer_code",
      "offer_name",
      "advertiser_name",
      "ip",
      "click_id",
      "geo",
      "carrier",
      "ua",
      "referer",
    ];
    const rows = data.map((r) => headers.map((h) => (r[h] ?? r.raw?.[h] ?? "")).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clicks-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportXLSX = () => {
    const wsData = data.map((r) => ({
      time: r.created_at,
      pub_code: r.pub_code,
      publisher_name: r.publisher_name,
      offer_code: r.offer_code,
      offer_name: r.offer_name,
      advertiser_name: r.advertiser_name,
      ip: r.ip,
      click_id: r.click_id,
      geo: r.geo,
      carrier: r.carrier,
      ua: r.ua,
      referer: r.referer,
    }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "clicks");
    XLSX.writeFile(wb, `clicks-${new Date().toISOString()}.xlsx`);
  };

  const onApplyFilters = () => {
    // reset offset when applying new filters
    setFilters((p) => ({ ...p, offset: 0 }));
    fetchData();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Clicks Analytics</h1>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => { setAutoRefresh(e.target.checked); if (!e.target.checked) clearInterval(intervalRef.current); else intervalRef.current = setInterval(fetchData, 5000); }} />
            Auto-refresh
          </label>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-12 gap-3 mb-4">
        <input value={filters.pub} onChange={(e) => setFilters({ ...filters, pub: e.target.value })} placeholder="PUB (PUB03 or id)" className="col-span-2 p-2 border rounded" />
        <input value={filters.offer} onChange={(e) => setFilters({ ...filters, offer: e.target.value })} placeholder="OFFER (OFF02 or id)" className="col-span-2 p-2 border rounded" />
        <input value={filters.geo} onChange={(e) => setFilters({ ...filters, geo: e.target.value })} placeholder="GEO (IN)" className="col-span-2 p-2 border rounded" />
        <input value={filters.carrier} onChange={(e) => setFilters({ ...filters, carrier: e.target.value })} placeholder="Carrier" className="col-span-2 p-2 border rounded" />
        <input value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} placeholder="YYYY-MM-DD" className="col-span-1 p-2 border rounded" />
        <input value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} placeholder="YYYY-MM-DD" className="col-span-1 p-2 border rounded" />
        <select value={filters.group} onChange={(e) => setFilters({ ...filters, group: e.target.value })} className="col-span-1 p-2 border rounded">
          <option value="none">No group</option>
          <option value="hour">Group hour</option>
          <option value="day">Group day</option>
        </select>

        <input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search IP/UA/params" className="col-span-4 p-2 border rounded mt-2" />

        <div className="col-span-8 flex gap-2 mt-2">
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={onApplyFilters}>Apply</button>
          <button className="bg-gray-800 text-white px-4 py-2 rounded" onClick={exportCSV}><Save className="inline-block w-4 h-4 mr-2" /> Export CSV</button>
          <button className="bg-gray-800 text-white px-4 py-2 rounded" onClick={exportXLSX}>Export XLSX</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white border rounded text-center">
          <div className="text-sm text-gray-500">Total Clicks</div>
          <div className="text-2xl font-bold">{totalClicks}</div>
        </div>
        <div className="p-4 bg-white border rounded text-center">
          <div className="text-sm text-gray-500">Top Publisher</div>
          <div className="text-lg">{topPublisher || "—"}</div>
        </div>
        <div className="p-4 bg-white border rounded text-center">
          <div className="text-sm text-gray-500">Top Offer</div>
          <div className="text-lg">{topOffer || "—"}</div>
        </div>
        <div className="p-4 bg-white border rounded text-center">
          <div className="text-sm text-gray-500">Group</div>
          <div className="text-lg">{filters.group}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-6 bg-white p-4 rounded border">
        <h3 className="font-semibold mb-2">Grouped ({filters.group})</h3>
        {grouped.length ? (
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={grouped}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tickFormatter={(t) => t.split("T")[0]} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="clicks" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-gray-500">No chart data</div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded border overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50">
              {[
                { key: "created_at", label: "Time" },
                { key: "pub_code", label: "PUB" },
                { key: "offer_code", label: "Offer" },
                { key: "ip", label: "IP" },
                { key: "click_id", label: "Click ID" },
                { key: "geo", label: "GEO" },
                { key: "carrier", label: "Carrier" },
                { key: "ua", label: "UA" },
                { key: "publisher_name", label: "Publisher" },
                { key: "offer_name", label: "Offer Name" },
                { key: "advertiser_name", label: "Advertiser" },
              ].map((c) => (
                <th key={c.key} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => toggleSort(c.key)}>
                  <div className="flex items-center justify-center gap-2">
                    <span>{c.label}</span>
                    {sort.key === c.key ? (sort.dir === "asc" ? "↑" : "↓") : ""}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={11} className="p-6 text-center">Loading...</td>
              </tr>
            ) : sortedData.length ? (
              sortedData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-center">{row.created_at}</td>
                  <td className="px-6 py-4 text-center">{row.pub_code}</td>
                  <td className="px-6 py-4 text-center">{row.offer_code}</td>
                  <td className="px-6 py-4 text-center">{row.ip}</td>
                  <td className="px-6 py-4 text-center">{row.click_id}</td>
                  <td className="px-6 py-4 text-center">{row.geo}</td>
                  <td className="px-6 py-4 text-center">{row.carrier}</td>
                  <td className="px-6 py-4 text-center">{row.ua}</td>
                  <td className="px-6 py-4 text-center">{row.publisher_name}</td>
                  <td className="px-6 py-4 text-center">{row.offer_name}</td>
                  <td className="px-6 py-4 text-center">{row.advertiser_name}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} className="p-6 text-center">No clicks found</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* pagination */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <button className="px-3 py-1 mr-2 border rounded" onClick={() => setFilters((p) => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}>Prev</button>
            <button className="px-3 py-1 border rounded" onClick={() => setFilters((p) => ({ ...p, offset: p.offset + p.limit }))}>Next</button>
          </div>

          <div className="flex items-center gap-2">
            <label>Rows</label>
            <select value={filters.limit} onChange={(e) => setFilters((p) => ({ ...p, limit: Number(e.target.value) }))} className="border p-1 rounded">
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </select>
          </div>
        </div>
      </div>

    </div>
  );
}
