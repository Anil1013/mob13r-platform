// frontend/src/pages/Clicks.jsx
import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = ['#4F46E5','#EF4444','#F59E0B','#10B981','#06B6D4','#8B5CF6'];

export default function Clicks() {
  const [rows, setRows] = useState([]);
  const [aggregates, setAggregates] = useState({});
  const [loading, setLoading] = useState(false);

  // filters
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pub, setPub] = useState("");
  const [offer, setOffer] = useState("");
  const [geo, setGeo] = useState("");
  const [carrier, setCarrier] = useState("");
  const [group, setGroup] = useState("hour"); // hour/day/none

  const [limit, setLimit] = useState(200);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.append("from", from);
      if (to) params.append("to", to);
      if (pub) params.append("pub_id", pub);
      if (offer) params.append("offer_id", offer);
      if (geo) params.append("geo", geo);
      if (carrier) params.append("carrier", carrier);
      if (group) params.append("group", group);
      params.append("limit", limit);

      const res = await apiClient.get(`/analytics/clicks?${params.toString()}`);
      setRows(res.data.rows || []);
      setAggregates(res.data.aggregates || {});
    } catch (err) {
      console.error("fetch clicks error", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const exportCsv = (fmt = "csv") => {
    const params = new URLSearchParams();
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    if (pub) params.append("pub_id", pub);
    if (offer) params.append("offer_id", offer);
    if (geo) params.append("geo", geo);
    if (carrier) params.append("carrier", carrier);
    params.append("format", fmt);
    const url = `${apiClient.defaults.baseURL}/analytics/clicks?${params.toString()}`;
    window.open(url, "_blank");
  };

  // prepare timeseries for chart
  const timeseries = useMemo(() => {
    const s = (aggregates.hourly || aggregates.daily || []).map(r => ({
      period: r.period,
      count: r.c
    }));
    return s;
  }, [aggregates]);

  const reasonPie = useMemo(() => {
    // top offers
    return (aggregates.byOffer || []).map((r, i) => ({ name: r.offer, value: r.c, color: COLORS[i % COLORS.length] }));
  }, [aggregates]);

  const pubPie = useMemo(() => {
    return (aggregates.byPub || []).map((r,i) => ({ name: r.pub, value: r.c, color: COLORS[i % COLORS.length]}));
  }, [aggregates]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Clicks Analytics</h1>

      <div className="flex gap-3 items-center mb-4">
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border p-2 rounded" />
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border p-2 rounded" />

        <input placeholder="Publisher (id or code)" value={pub} onChange={e => setPub(e.target.value)} className="border p-2 rounded w-40" />
        <input placeholder="Offer (id or code)" value={offer} onChange={e => setOffer(e.target.value)} className="border p-2 rounded w-40" />

        <input placeholder="GEO" value={geo} onChange={e => setGeo(e.target.value.toUpperCase())} className="border p-2 rounded w-24" />
        <input placeholder="Carrier" value={carrier} onChange={e => setCarrier(e.target.value)} className="border p-2 rounded w-32" />

        <select value={group} onChange={e=>setGroup(e.target.value)} className="border p-2 rounded">
          <option value="hour">Hourly</option>
          <option value="day">Daily</option>
          <option value="none">No group</option>
        </select>

        <button onClick={fetchData} className="bg-blue-600 text-white px-4 py-2 rounded">Apply</button>

        <div className="ml-auto flex gap-2">
          <button onClick={() => exportCsv("csv")} className="bg-gray-800 text-white px-3 py-2 rounded">Export CSV</button>
          <button onClick={() => exportCsv("xlsx")} className="bg-gray-800 text-white px-3 py-2 rounded">Export XLSX</button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Total Clicks</div>
          <div className="text-2xl font-semibold">{aggregates.total ?? 0}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Unique Publishers</div>
          <div className="text-2xl font-semibold">{(aggregates.byPub || []).length}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Unique Offers</div>
          <div className="text-2xl font-semibold">{(aggregates.byOffer || []).length}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Top PUB</div>
          <div className="text-2xl font-semibold">{(aggregates.byPub?.[0]?.pub) || "—"} <span className="text-sm">({aggregates.byPub?.[0]?.c || 0})</span></div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-2 bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Clicks over time</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={timeseries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tickFormatter={(v) => new Date(v).toLocaleString()} />
                <YAxis />
                <Tooltip labelFormatter={(v) => new Date(v).toLocaleString()} />
                <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Top Offers</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={reasonPie} dataKey="value" nameKey="name" outerRadius={80} label>
                  {reasonPie.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Legend verticalAlign="bottom" height={36} />
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
                <th className="p-2">GEO</th>
                <th className="p-2">Carrier</th>
                <th className="p-2">IP</th>
                <th className="p-2">Click ID</th>
                <th className="p-2">UA</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="p-4 text-center">Loading…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={8} className="p-4 text-center">No rows</td></tr>}
              {!loading && rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-2">{r.publisher_name || r.pub_code || r.publisher_id}</td>
                  <td className="p-2">{r.offer_name || r.offer_code || r.offer_id}</td>
                  <td className="p-2">{r.geo}</td>
                  <td className="p-2">{r.carrier}</td>
                  <td className="p-2 font-mono">{r.ip_address}</td>
                  <td className="p-2">{r.click_id}</td>
                  <td className="p-2 break-words text-xs">{r.user_agent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
