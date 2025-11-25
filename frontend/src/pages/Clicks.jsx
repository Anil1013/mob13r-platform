// frontend/src/pages/Clicks.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card.jsx";
import apiClient from "../api/apiClient";
import { format, parseISO } from "date-fns";
import ClicksChart from "../components/charts/ClicksChart.jsx";

export default function ClicksPage() {
  const [rows, setRows] = useState([]);
  const [group, setGroup] = useState("none"); // none | hour | day
  const [limit, setLimit] = useState(200);
  const [offset, setOffset] = useState(0);

  // filters
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pubId, setPubId] = useState("");
  const [offerId, setOfferId] = useState("");
  const [geo, setGeo] = useState("");
  const [carrier, setCarrier] = useState("");
  const [q, setQ] = useState("");

  // advanced filters
  const [ip, setIp] = useState("");
  const [clickId, setClickId] = useState("");
  const [ua, setUa] = useState("");
  const [fraudFlag, setFraudFlag] = useState(""); // '', true, false

  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // backend route (through apiClient)
  const API = "/analytics/clicks";

  // Ensure smart date defaults:
  // - if neither from/to selected => default to today
  // - if only from => to = from
  // - if only to => from = to
  const buildDateRange = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    let f = from;
    let t = to;

    if (!f && !t) {
      f = today;
      t = today;
    } else if (f && !t) {
      t = f;
    } else if (!f && t) {
      f = t;
    }

    return { from: f || undefined, to: t || undefined };
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const { from: f, to: t } = buildDateRange();

      // build params (don't send undefined fields)
      const params = {
        pub_id: pubId || undefined,
        offer_id: offerId || undefined,
        geo: geo || undefined,
        carrier: carrier || undefined,
        q: q || undefined,
        ip: ip || undefined,
        click_id: clickId || undefined,
        ua: ua || undefined,
        fraud_flag: fraudFlag === "" ? undefined : fraudFlag === "true",
        from: f,
        to: t,
        group,
        limit,
        offset,
      };

      const { data } = await apiClient.get(API, { params });

      // backend expected shape (sample): { rows: [...], total: N, limit, offset }
      setRows(data.rows || []);
      setTotal(data.total || (data.rows ? data.rows.length : 0));
    } catch (err) {
      console.error("fetchData error", err);
      alert("Failed to fetch clicks (see console).");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // initial load
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onApply = () => {
    setOffset(0);
    fetchData();
  };

  const exportCsv = async () => {
    try {
      const { from: f, to: t } = buildDateRange();

      const params = {
        pub_id: pubId || undefined,
        offer_id: offerId || undefined,
        geo: geo || undefined,
        carrier: carrier || undefined,
        q: q || undefined,
        ip: ip || undefined,
        click_id: clickId || undefined,
        ua: ua || undefined,
        fraud_flag: fraudFlag === "" ? undefined : fraudFlag === "true",
        from: f,
        to: t,
        group,
        limit,
        offset,
        format: "csv",
      };

      const resp = await apiClient.get(API, {
        params,
        responseType: "blob",
      });

      const blob = new Blob([resp.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clicks-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("exportCsv error:", err);
      alert("Failed to export CSV. Check console.");
    }
  };

  // helper: get click id from params
  const resolveClickId = (r) => {
    return (
      r.click_id ||
      r.params?.click_id ||
      r.params?.cid ||
      r.params?.clickID ||
      clickId ||
      "-"
    );
  };

  // prepare chart data (client-side grouping by hour/day) — uses rows currently loaded
  const chartData = useMemo(() => {
    if (group === "none" || !rows || rows.length === 0) return [];

    const map = {};

    rows.forEach((r) => {
      const ts = r.created_at ? new Date(r.created_at) : new Date();
      let key;
      if (group === "hour") {
        // YYYY-MM-DD HH:00
        key = format(ts, "yyyy-MM-dd HH':00'");
      } else {
        // day
        key = format(ts, "yyyy-MM-dd");
      }
      map[key] = (map[key] || 0) + 1;
    });

    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => ({ time: k, clicks: v }));
  }, [group, rows]);

  const thStyle = { textAlign: "center", padding: "10px 6px", background: "#f3f4f6" };
  const tdStyle = { textAlign: "center", padding: "10px 6px" };

  return (
    <div className="p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Clicks Analytics</CardTitle>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {/* Primary filters */}
            <input placeholder="PUB" value={pubId} onChange={(e) => setPubId(e.target.value)} className="border rounded p-2" />
            <input placeholder="OFFER" value={offerId} onChange={(e) => setOfferId(e.target.value)} className="border rounded p-2" />
            <input placeholder="GEO" value={geo} onChange={(e) => setGeo(e.target.value)} className="border rounded p-2" />
            <input placeholder="Carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} className="border rounded p-2" />

            {/* date inputs */}
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded p-2" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded p-2" />

            {/* group */}
            <select value={group} onChange={(e) => setGroup(e.target.value)} className="border rounded p-2">
              <option value="none">No Group</option>
              <option value="hour">Hourly</option>
              <option value="day">Daily</option>
            </select>

            {/* Advanced - quick toggle show/hide could be added; for now always visible */}
            <input placeholder="IP" value={ip} onChange={(e) => setIp(e.target.value)} className="border rounded p-2" />
            <input placeholder="Click ID" value={clickId} onChange={(e) => setClickId(e.target.value)} className="border rounded p-2" />
            <input placeholder="UA (partial)" value={ua} onChange={(e) => setUa(e.target.value)} className="border rounded p-2" />

            <select value={fraudFlag} onChange={(e) => setFraudFlag(e.target.value)} className="border rounded p-2">
              <option value="">Any Fraud</option>
              <option value="true">Fraud Only</option>
              <option value="false">Non-Fraud Only</option>
            </select>

            <button onClick={onApply} className="bg-blue-600 text-white px-4 py-2 rounded">Apply</button>
            <button onClick={exportCsv} className="bg-black text-white px-4 py-2 rounded">Export CSV</button>
          </div>
        </CardHeader>

        <CardContent>
          <div style={{ display: "flex", textAlign: "center", marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12 }}>Total Clicks</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{total}</div>
            </div>
          </div>

          {/* Chart area — only renders when grouped */}
          {group !== "none" && <div style={{ height: 260, marginBottom: 20 }}><ClicksChart data={chartData} group={group} /></div>}

          <div style={{ overflowX: "auto" }}>
            <table className="w-full border-collapse" style={{ minWidth: 1300 }}>
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
                  <tr><td colSpan={12} style={tdStyle}>Loading...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={12} style={tdStyle}>No Data</td></tr>
                ) : (
                  rows.map((r) => {
                    const click_id_resolved = resolveClickId(r);

                    // fallback naming: publisher_name || publisher || pub_id
                    const publisherName = r.publisher_name || r.publisher || r.pub_name || r.pub_id || r.pub_code;
                    const offerName = r.offer_name || r.offer || r.offer_code || r.offer_id;
                    const advertiserName = r.advertiser_name || r.advertiser || r.advertiser_code || "-";
                    const time = r.created_at ? new Date(r.created_at).toLocaleString() : "-";
                    const ipShow = r.ip || r.ip_address || r.client_ip || "-";
                    const uaShow = r.ua || r.user_agent || r.ua_string || "-";

                    return (
                      <tr key={r.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                        <td style={tdStyle}>{time}</td>
                        <td style={tdStyle}>{r.pub_id || r.pub_code}</td>
                        <td style={tdStyle}>{publisherName}</td>
                        <td style={tdStyle}>{r.offer_id}</td>
                        <td style={tdStyle}>{offerName}</td>
                        <td style={tdStyle}>{advertiserName}</td>
                        <td style={tdStyle}>{ipShow}</td>
                        <td style={tdStyle}>{click_id_resolved}</td>
                        <td style={tdStyle}>{r.geo}</td>
                        <td style={tdStyle}>{r.carrier}</td>
                        <td style={{ ...tdStyle, maxWidth: 300, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {uaShow}
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
