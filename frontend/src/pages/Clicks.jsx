// frontend/src/pages/Clicks.jsx
import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient"; // expects apiClient that auto-attaches token

export default function Clicks() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [aggregates, setAggregates] = useState({});
  const [limit, setLimit] = useState(200);
  const [offset, setOffset] = useState(0);

  // filters
  const [pub, setPub] = useState("");
  const [offer, setOffer] = useState("");
  const [geo, setGeo] = useState("");
  const [carrier, setCarrier] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("none"); // none|hour|day

  const fetchData = async (opts = {}) => {
    try {
      setLoading(true);
      const params = {
        limit,
        offset,
        group,
      };

      if (pub) params.pub_id = pub;
      if (offer) params.offer_id = offer;
      if (geo) params.geo = geo;
      if (carrier) params.carrier = carrier;
      if (from) params.from = from;
      if (to) params.to = to;
      if (q) params.q = q;
      if (opts.format) params.format = opts.format;

      // If requesting export, we will download as blob. Otherwise JSON.
      if (opts.format === "csv" || opts.format === "xlsx") {
        const res = await apiClient.get("/analytics/clicks", {
          params,
          responseType: "blob",
        });

        // Determine filename from content-disposition
        const cd = res.headers["content-disposition"] || res.headers["Content-Disposition"];
        let filename = `clicks_export.${opts.format === "xlsx" ? "xlsx" : "csv"}`;
        if (cd) {
          const match = cd.match(/filename="?(.*)"?/);
          if (match) filename = match[1];
        }

        const blob = new Blob([res.data], { type: res.headers["content-type"] });
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(link.href);
        return;
      }

      // Normal JSON fetch
      const res = await apiClient.get("/analytics/clicks", { params });
      setRows(res.data.rows || []);
      setAggregates(res.data.aggregates || {});
    } catch (err) {
      console.error("fetch clicks error", err);
      alert("Failed to load clicks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, offset, group]);

  const applyFilters = () => {
    setOffset(0);
    fetchData();
  };

  const exportCSV = () => fetchData({ format: "csv" });
  const exportXLSX = () => fetchData({ format: "xlsx" });

  // derived metrics for quick display
  const metrics = useMemo(() => {
    return {
      total: aggregates.total || 0,
      topPub: (aggregates.byPub && aggregates.byPub[0]) ? aggregates.byPub[0] : null,
      topOffer: (aggregates.byOffer && aggregates.byOffer[0]) ? aggregates.byOffer[0] : null,
    };
  }, [aggregates]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Clicks Analytics</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input placeholder="PUB (PUB03 or id)" value={pub} onChange={e=>setPub(e.target.value)} className="border p-2 rounded w-44" />
        <input placeholder="OFFER (OFF02 or id)" value={offer} onChange={e=>setOffer(e.target.value)} className="border p-2 rounded w-44" />
        <input placeholder="GEO (IN)" value={geo} onChange={e=>setGeo(e.target.value.toUpperCase())} className="border p-2 rounded w-28" />
        <input placeholder="Carrier" value={carrier} onChange={e=>setCarrier(e.target.value)} className="border p-2 rounded w-36" />
        <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="border p-2 rounded" />
        <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="border p-2 rounded" />
        <input placeholder="Search IP/UA/params" value={q} onChange={e=>setQ(e.target.value)} className="border p-2 rounded flex-1 min-w-[220px]" />
        <select value={group} onChange={e=>setGroup(e.target.value)} className="border p-2 rounded">
          <option value="none">No group</option>
          <option value="hour">Hourly</option>
          <option value="day">Daily</option>
        </select>
        <button onClick={applyFilters} className="bg-blue-600 text-white px-3 py-2 rounded">Apply</button>

        <div className="ml-auto flex gap-2">
          <button onClick={exportCSV} className="bg-gray-800 text-white px-3 py-2 rounded">Export CSV</button>
          <button onClick={exportXLSX} className="bg-gray-800 text-white px-3 py-2 rounded">Export XLSX</button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Total Clicks</div>
          <div className="text-2xl font-semibold">{metrics.total.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Top Publisher</div>
          <div className="text-2xl font-semibold">{metrics.topPub ? `${metrics.topPub.pub} (${metrics.topPub.c})` : "—"}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Top Offer</div>
          <div className="text-2xl font-semibold">{metrics.topOffer ? `${metrics.topOffer.offer} (${metrics.topOffer.c})` : "—"}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Group</div>
          <div className="text-2xl font-semibold">{group}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white p-4 rounded shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">Time</th>
                <th className="p-2">PUB</th>
                <th className="p-2">Offer</th>
                <th className="p-2">IP</th>
                <th className="p-2">Click ID</th>
                <th className="p-2">GEO</th>
                <th className="p-2">Carrier</th>
                <th className="p-2">UA</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="p-4 text-center">Loading…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={8} className="p-4 text-center">No clicks</td></tr>}
              {!loading && rows.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-2">{r.publisher_name || r.pub_code || r.publisher_id}</td>
                  <td className="p-2">{r.offer_name || r.offer_code || r.offer_id}</td>
                  <td className="p-2 font-mono">{r.ip_address}</td>
                  <td className="p-2">{r.click_id}</td>
                  <td className="p-2">{r.geo || "—"}</td>
                  <td className="p-2">{r.carrier || "—"}</td>
                  <td className="p-2 break-words max-w-[300px]">{r.user_agent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div>
            <button onClick={() => { setOffset(Math.max(0, offset - limit)); fetchData(); }} className="px-3 py-1 bg-gray-200 rounded mr-2">Prev</button>
            <button onClick={() => { setOffset(offset + limit); fetchData(); }} className="px-3 py-1 bg-gray-200 rounded">Next</button>
          </div>
          <div>
            <select value={limit} onChange={e=>{ setLimit(Number(e.target.value)); setOffset(0); }} className="border p-1 rounded">
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </select>
          </div>
        </div>
      </div>

      {/* Aggregates: hourly/daily view if present */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Top GEOs</h3>
          <ul className="text-sm">
            {(aggregates.byGeo||[]).map(g=>(
              <li key={g.geo} className="flex justify-between"><span>{g.geo}</span><span>{g.c}</span></li>
            ))}
          </ul>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Top Carriers</h3>
          <ul className="text-sm">
            {(aggregates.byCarrier||[]).map(c=>(
              <li key={c.carrier} className="flex justify-between"><span>{c.carrier}</span><span>{c.c}</span></li>
            ))}
          </ul>
        </div>

        <div className="col-span-2 bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Grouped (hour/day)</h3>
          {group === "hour" && (aggregates.hourly || []).length === 0 && <div className="text-sm text-gray-500">No hourly data.</div>}
          {group === "day" && (aggregates.daily || []).length === 0 && <div className="text-sm text-gray-500">No daily data.</div>}

          {(group === "hour" ? (aggregates.hourly || []) : (group === "day" ? (aggregates.daily || []) : [])).map((g, idx) => (
            <div key={idx} className="flex justify-between text-sm border-b py-1">
              <div>{new Date(g.period).toLocaleString()}</div>
              <div>{g.count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
