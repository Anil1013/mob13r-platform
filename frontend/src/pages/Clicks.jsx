// file: frontend/src/pages/Clicks.jsx
// local path (use this as file URL): frontend/src/pages/Clicks.jsx

import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card.jsx";
import apiClient from "../api/apiClient";
import { format, parseISO } from "date-fns";

export default function ClicksPage() {
  const [rows, setRows] = useState([]);
  const [group, setGroup] = useState("none");
  const [limit, setLimit] = useState(200);
  const [offset, setOffset] = useState(0);

  // Filters
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pubId, setPubId] = useState("");
  const [offerId, setOfferId] = useState("");
  const [geo, setGeo] = useState("");
  const [carrier, setCarrier] = useState("");
  const [ip, setIp] = useState("");
  const [clickId, setClickId] = useState("");
  const [ua, setUa] = useState("");
  const [fraudFlag, setFraudFlag] = useState(""); // "", "true", "false"

  const [q, setQ] = useState(""); // general search box
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState("line"); // line or bar

  const API = "/analytics/clicks";

  // Helper: return today's date string yyyy-MM-dd
  const todayStr = () => format(new Date(), "yyyy-MM-dd");

  // Build params - if date fields blank then default to today
  const buildParams = () => {
    const params = {};

    params.pub_id = pubId || undefined;
    params.offer_id = offerId || undefined;
    params.geo = geo || undefined;
    params.carrier = carrier || undefined;

    // Advanced fields combined into 'q' search when backend supports it
    // We also add specific params which backend may use if implemented
    const parts = [];
    if (q) parts.push(q);
    if (ip) { parts.push(ip); params.ip = ip; }
    if (clickId) { parts.push(clickId); params.click_id = clickId; }
    if (ua) { parts.push(ua); params.ua = ua; }
    if (parts.length) params.q = parts.join(" ");

    if (fraudFlag) params.fraud_flag = fraudFlag; // backend may handle this

    // Date logic: if either from/to empty, default both to today (so UI shows current date data)
    const f = from || todayStr();
    const t = to || todayStr();

    // Use full day boundaries — backend may expect date string; we pass as YYYY-MM-DD
    params.from = f;
    params.to = t;

    params.group = group || "none";
    params.limit = limit;
    params.offset = offset;

    return params;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = buildParams();
      const { data } = await apiClient.get(API, { params });

      // Backends can return different shapes — try to be resilient
      if (data) {
        // If backend returns { rows, total }
        if (Array.isArray(data.rows)) {
          setRows(data.rows);
          setTotal(data.total || 0);
        } else if (Array.isArray(data)) {
          // older backends may return rows directly
          setRows(data);
          setTotal(data.length);
        } else if (Array.isArray(data.rows || data.data)) {
          setRows((data.rows || data.data) ?? []);
          setTotal(data.total || (data.rows || data.data)?.length || 0);
        } else {
          // fallback: try data.rows
          setRows(data.rows || []);
          setTotal(data.total || 0);
        }
      }
    } catch (err) {
      console.error("fetchData error", err);
      alert("Failed to fetch clicks. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onApply = () => {
    setOffset(0);
    fetchData();
  };

  // CSV Export: request backend with format=csv so server builds proper fields and order
  const exportCsv = async () => {
    try {
      const params = { ...buildParams(), format: "csv" };
      const resp = await apiClient.get(API, { params, responseType: "blob", timeout: 60000 });

      const blob = new Blob([resp.data], { type: resp.data.type || "text/csv;charset=utf-8;" });
      const filename = `clicks_${params.pub_id || "all"}_${format(new Date(), "yyyy-MM-dd")}.csv`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("exportCsv error", err);
      alert("Failed to export CSV.");
    }
  };

  // Build timeseries (hourly or daily) from rows if user requested grouping or chart
  const timeseries = useMemo(() => {
    if (!rows || rows.length === 0) return [];

    const map = new Map();

    rows.forEach((r) => {
      const created = r.created_at || r.createdAt || r.createdAt;
      let d;
      try {
        d = typeof created === "string" ? parseISO(created) : new Date(created);
      } catch {
        d = new Date();
      }
      if (isNaN(d)) return;

      let key;
      if (group === "hour") {
        // yyyy-MM-dd HH:00
        key = `${format(d, "yyyy-MM-dd HH")}:00`;
      } else if (group === "day") {
        key = format(d, "yyyy-MM-dd");
      } else {
        // default to day grouping for chart view
        key = format(d, "yyyy-MM-dd");
      }

      map.set(key, (map.get(key) || 0) + 1);
    });

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => ({ period: k, count: v }));
  }, [rows, group]);

  // CSV-friendly row formatter for client-side export if needed
  // (we prefer server-side export, but keep client fallback)
  const clientCsvDownload = () => {
    if (!rows || rows.length === 0) return alert("No rows to export");

    const headers = [
      "id",
      "created_at",
      "pub_id",
      "publisher_name",
      "offer_id",
      "offer_name",
      "advertiser_name",
      "ip",
      "click_id",
      "geo",
      "carrier",
      "ua",
      "params",
    ];

    const csvRows = [headers.join(",")];

    rows.forEach((r) => {
      const clickId = r.click_id || r.params?.click_id || r.params?.cid || "";
      const row = [
        r.id,
        r.created_at,
        r.pub_id || r.pub_code || r.publisher_id || "",
        r.publisher_name || "",
        r.offer_id || r.offer_code || "",
        r.offer_name || "",
        r.advertiser_name || "",
        r.ip || r.ip_address || "",
        `"${clickId}"`,
        r.geo || "",
        r.carrier || "",
        `"${(r.ua || r.user_agent || "").replace(/"/g, '""') }"`,
        `"${JSON.stringify(r.params || {})}"`,
      ];

      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const filename = `clicks_client_${format(new Date(), "yyyy-MM-dd")}.csv`;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const thStyle = { textAlign: "center", padding: "10px 6px", background: "#f3f4f6" };
  const tdStyle = { textAlign: "center", padding: "10px 6px" };

  return (
    <div className="p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Clicks Analytics</CardTitle>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            <input placeholder="PUB (PUB03)" value={pubId} onChange={(e) => setPubId(e.target.value.toUpperCase())} className="border rounded p-2" />
            <input placeholder="OFFER" value={offerId} onChange={(e) => setOfferId(e.target.value)} className="border rounded p-2" />
            <input placeholder="GEO" value={geo} onChange={(e) => setGeo(e.target.value.toUpperCase())} className="border rounded p-2" />
            <input placeholder="Carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} className="border rounded p-2" />

            <input placeholder="IP" value={ip} onChange={(e) => setIp(e.target.value)} className="border rounded p-2" />
            <input placeholder="Click ID" value={clickId} onChange={(e) => setClickId(e.target.value)} className="border rounded p-2" />
            <input placeholder="UA (search)" value={ua} onChange={(e) => setUa(e.target.value)} className="border rounded p-2" />

            <select value={fraudFlag} onChange={(e) => setFraudFlag(e.target.value)} className="border rounded p-2">
              <option value="">Fraud (any)</option>
              <option value="true">Fraud: Yes</option>
              <option value="false">Fraud: No</option>
            </select>

            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded p-2" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded p-2" />

            <select value={group} onChange={(e) => setGroup(e.target.value)} className="border rounded p-2">
              <option value="none">No Group</option>
              <option value="hour">Hourly</option>
              <option value="day">Daily</option>
            </select>

            <select value={chartType} onChange={(e) => setChartType(e.target.value)} className="border rounded p-2">
              <option value="line">Line Chart</option>
              <option value="bar">Bar Chart</option>
            </select>

            <button onClick={onApply} className="bg-blue-600 text-white px-4 py-2 rounded">Apply</button>
            <button onClick={exportCsv} className="bg-black text-white px-4 py-2 rounded">Export CSV (server)</button>
            <button onClick={clientCsvDownload} className="bg-gray-700 text-white px-4 py-2 rounded">Export CSV (client fallback)</button>
          </div>
        </CardHeader>

        <CardContent>
          <div style={{ display: "flex", textAlign: "center", marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12 }}>Total Clicks</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{total}</div>
            </div>
          </div>

          {/* Chart */}
          <div style={{ height: 260, marginBottom: 16 }}>
            <ResponsiveContainer>
              {chartType === "line" ? (
                <LineChart data={timeseries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} />
                </LineChart>
              ) : (
                <BarChart data={timeseries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table className="w-full border-collapse" style={{ minWidth: 1200 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Time</th>
                  <th style={thStyle}>Publisher</th>
                  <th style={thStyle}>Publisher Name</th>
                  <th style={thStyle}>Offer</th>
                  <th style={thStyle}>Offer Name</th>
                  <th style={thStyle}>Advertiser</th>
                  <th style={thStyle}>IP</th>
                  <th style={thStyle}>Click ID</th>
                  <th style={thStyle}>GEO</th>
                  <th style={thStyle}>Carrier</th>
                  <th style={thStyle}>UA</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr><td colSpan={11} style={tdStyle}>Loading...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={11} style={tdStyle}>No Data</td></tr>
                ) : (
                  rows.map((r) => {
                    // normalize different back-end shapes
                    const created = r.created_at || r.createdAt || r.createdAt || new Date().toISOString();
                    const pubDisplay = r.pub_code || r.pub_id || r.publisher_id || "";
                    const publisherName = r.publisher_name || r.publisher || "";
                    const offerDisplay = r.offer_code || r.offer_id || "";
                    const offerName = r.offer_name || r.offer || "";
                    const advertiser = r.advertiser_name || r.advertiser || "";
                    const ipVal = r.ip || r.ip_address || r.ipAddress || "";

                    const clickIdVal = r.click_id || r.params?.click_id || r.params?.cid || r.params?.clickID || "";
                    const uaVal = r.ua || r.user_agent || r.userAgent || "";

                    return (
                      <tr key={r.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                        <td style={tdStyle}>{new Date(created).toLocaleString()}</td>
                        <td style={tdStyle}>{pubDisplay}</td>
                        <td style={tdStyle}>{publisherName}</td>
                        <td style={tdStyle}>{offerDisplay}</td>
                        <td style={tdStyle}>{offerName}</td>
                        <td style={tdStyle}>{advertiser}</td>
                        <td style={tdStyle}>{ipVal}</td>
                        <td style={tdStyle}>{clickIdVal}</td>
                        <td style={tdStyle}>{r.geo}</td>
                        <td style={tdStyle}>{r.carrier}</td>
                        <td style={{ ...tdStyle, maxWidth: 300, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {uaVal}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
            <div>
              <button
                onClick={() => {
                  setOffset(Math.max(0, offset - limit));
                  fetchData();
                }}
                className="border rounded px-3 py-1 mr-2"
              >
                Prev
              </button>

              <button
                onClick={() => {
                  setOffset(offset + limit);
                  fetchData();
                }}
                className="border rounded px-3 py-1"
              >
                Next
              </button>
            </div>

            <div>
              <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="border rounded p-2">
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
