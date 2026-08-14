import { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import {
  page, pageTitle, topRow, viewTabs, tabBtn, tabBtnActive,
  statRow, statCard, statLabel, statValue,
  filterBar, filterInput, filterSelect, applyBtn, exportBtn,
  tableWrap, tableScroll, stickyTh, stickyTd, totalRow,
  table,
} from "../styles/shared.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

const todayIST = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find(p=>p.type==="year")?.value;
  const m = parts.find(p=>p.type==="month")?.value;
  const d = parts.find(p=>p.type==="day")?.value;
  return `${y}-${m}-${d}`;
};

const defaultFilters = { advertisers:[], publishers:[], geos:[], carriers:[], offers:[] };

const formatDate = (value, tz = "Asia/Kolkata") => {
  if (!value) return "-";
  if (typeof value === "string" && !value.includes("T") && !value.match(/^\d{4}-\d{2}-\d{2}$/)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:true, timeZone: tz }).format(parsed);
};

const formatDateOnly = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", { day:"2-digit", month:"2-digit", year:"numeric" }).format(parsed);
};

const toNumber = (value) => Number(value || 0);
const money = (value) => `$${toNumber(value).toFixed(2)}`;

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const normalized = typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

export default function Dashboard() {
  const today = todayIST();
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [advertiser, setAdvertiser] = useState("");
  const [publisher, setPublisher] = useState("");
  const [geo, setGeo] = useState("");
  const [carrier, setCarrier] = useState("");
  const [offer, setOffer] = useState("");
  const [view, setView] = useState("summary");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [timezone, setTimezone] = useState("Asia/Kolkata");

  const authHeader = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      params.append("from", from); params.append("to", to); params.append("view", view);
      if (advertiser) params.append("advertiser", advertiser);
      if (publisher) params.append("publisher", publisher);
      if (geo) params.append("geo", geo);
      if (carrier) params.append("carrier", carrier);
      if (offer) params.append("offer_id", offer);
      const response = await fetch(`${API_BASE}/api/dashboard/report?${params.toString()}`, { headers: authHeader });
      if (!response.ok) { setData([]); setError(""); return; }
      const json = await response.json();
      setData(Array.isArray(json?.data) ? json.data : []);
    } catch (err) {
      setData([]);
      if (err.name !== "TypeError") setError(err.message || "Failed to load report");
    } finally { setLoading(false); }
  }, [from, to, advertiser, publisher, geo, carrier, offer, view, authHeader]);

  const loadFilters = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/dashboard/filters`, { headers: authHeader });
      if (!response.ok) return;
      const json = await response.json();
      setFilters({
        advertisers: Array.isArray(json?.advertisers) ? json.advertisers : [],
        publishers: Array.isArray(json?.publishers) ? json.publishers : [],
        geos: Array.isArray(json?.geos) ? json.geos : [],
        carriers: Array.isArray(json?.carriers) ? json.carriers : [],
        offers: Array.isArray(json?.offers) ? json.offers : [],
      });
    } catch { setFilters(defaultFilters); }
  }, [authHeader]);

  const loadRealtime = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append("from", from); params.append("to", to);
      if (advertiser) params.append("advertiser", advertiser);
      if (publisher) params.append("publisher", publisher);
      if (geo) params.append("geo", geo);
      if (carrier) params.append("carrier", carrier);
      if (offer) params.append("offer_id", offer);
      const response = await fetch(`${API_BASE}/api/dashboard/realtime?${params.toString()}`, { headers: authHeader });
      if (!response.ok) return;
      const json = await response.json();
      setStats(json?.data && typeof json.data === "object" ? json.data : {});
    } catch { setStats({}); }
  }, [from, to, advertiser, publisher, geo, carrier, offer, authHeader]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, from, to]);

  useEffect(() => { loadReport(); loadFilters(); loadRealtime(); }, [loadReport, loadFilters, loadRealtime]);

  const exportCSV = () => {
    if (!data.length) { alert("No data to export"); return; }
    const headers = Object.keys(data[0]);
    const csv = [headers.join(","), ...data.map(row => headers.map(header => csvCell(row[header])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "traffic_report.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const total = useMemo(() => data.reduce((acc, row) => {
    acc.pin_req += toNumber(row.pin_req); acc.unique_req += toNumber(row.unique_req);
    acc.pin_sent += toNumber(row.pin_sent); acc.unique_sent += toNumber(row.unique_sent);
    acc.verify_req += toNumber(row.verify_req); acc.unique_verify += toNumber(row.unique_verify);
    acc.verified += toNumber(row.verified); acc.publisher_verified += toNumber(row.publisher_verified);
    acc.revenue += toNumber(row.revenue); acc.publisher_revenue += toNumber(row.publisher_revenue);
    acc.profit += toNumber(row.profit);
    return acc;
  }, { pin_req:0, unique_req:0, pin_sent:0, unique_sent:0, verify_req:0, unique_verify:0, verified:0, publisher_verified:0, revenue:0, publisher_revenue:0, profit:0 }), [data]);

  return (
    <>
      <Navbar />
      <div style={page}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16}}>
          <h1 style={{...pageTitle, margin:0}}>Traffic Dashboard</h1>
          <div style={{display:"flex", gap:8, alignItems:"center"}}>
            {data.length > 0 && (
              <span style={{background:"rgba(34,197,94,0.1)", color:"#22c55e", padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:700}}>
                {data.length} rows loaded
              </span>
            )}
            <span style={{background:"rgba(148,163,184,0.1)", color:"#94a3b8", padding:"4px 12px", borderRadius:20, fontSize:12}}>
              {from === to ? from : `${from} → ${to}`}
            </span>
          </div>
        </div>

        {/* TABS + STATS — same row */}
        <div style={topRow}>
          <div style={viewTabs}>
            <button onClick={() => setView("summary")} style={{...tabBtn, ...(view==="summary" ? tabBtnActive : {})}}>Summary</button>
            <button onClick={() => setView("daily")} style={{...tabBtn, ...(view==="daily" ? tabBtnActive : {})}}>Daily</button>
          </div>

          <div style={{display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:10}}>
            {[
              { label:"📥 Requests",    value: stats.total_requests||0,    color:"#3b82f6", sub: `Unique: ${stats.unique_requests||0}` },
              { label:"📤 OTP Sent",    value: stats.otp_sent||0,          color:"#06b6d4", sub: `Unique: ${stats.unique_sent||0}` },
              { label:"✅ Conversions", value: stats.conversions||0,        color:"#22c55e", sub: `CR: ${stats.total_requests ? ((stats.conversions/stats.total_requests)*100).toFixed(1) : 0}%` },
              { label:"💰 Revenue",     value: `$${Number(total.revenue||0).toFixed(2)}`,   color:"#f59e0b", sub: `Pub: $${Number(total.publisher_revenue||0).toFixed(2)}` },
              { label:"📈 Profit",      value: `$${Number(total.profit||0).toFixed(2)}`,     color:"#8b5cf6", sub: `Margin: ${total.revenue ? ((total.profit/total.revenue)*100).toFixed(0) : 0}%` },
              { label:"⏱ Last Hour",   value: stats.last_hour_requests||0, color:"#e94560", sub: "requests" },
              { label:"🔄 CR %",        value: `${stats.total_requests ? ((stats.conversions/stats.total_requests)*100).toFixed(1) : 0}%`, color:"#16a34a", sub: `${stats.conversions||0} verified` },
            ].map((s,i) => (
              <div key={i} style={{...statCard, borderLeft:`3px solid ${s.color}`, padding:"12px 14px"}}>
                <div style={{...statLabel, fontSize:10, marginBottom:4}}>{s.label}</div>
                <div style={{...statValue, color:s.color, fontSize:20}}>{s.value}</div>
                <div style={{fontSize:10, color:"#64748b", marginTop:3}}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {error ? <p style={{color:"#f87171", fontSize:13, marginBottom:12}}>{error}</p> : null}

        {/* QUICK INSIGHTS */}
        {data.length > 0 && (
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16}}>
            {/* Top Offer */}
            <div style={{background:"#1e293b", borderRadius:10, padding:"12px 16px", border:"1px solid rgba(255,255,255,0.06)"}}>
              <div style={{fontSize:11, color:"#64748b", fontWeight:700, textTransform:"uppercase", marginBottom:8}}>🏆 Top Offer (by conversions)</div>
              {(() => {
                const grouped = data.reduce((acc, r) => {
                  const key = r.offer || r.service_name || "-";
                  if (!acc[key]) acc[key] = { conversions: 0, revenue: 0 };
                  acc[key].conversions += Number(r.verified || 0);
                  acc[key].revenue += Number(r.revenue || 0);
                  return acc;
                }, {});
                const top = Object.entries(grouped).sort((a,b) => b[1].conversions - a[1].conversions)[0];
                return top ? (
                  <div>
                    <div style={{color:"#f1f5f9", fontWeight:700, fontSize:14}}>{top[0]}</div>
                    <div style={{color:"#22c55e", fontSize:13}}>{top[1].conversions} conversions · ${top[1].revenue.toFixed(2)}</div>
                  </div>
                ) : <div style={{color:"#64748b"}}>No data</div>;
              })()}
            </div>
            {/* Top Publisher */}
            <div style={{background:"#1e293b", borderRadius:10, padding:"12px 16px", border:"1px solid rgba(255,255,255,0.06)"}}>
              <div style={{fontSize:11, color:"#64748b", fontWeight:700, textTransform:"uppercase", marginBottom:8}}>⭐ Top Publisher (by revenue)</div>
              {(() => {
                const grouped = data.reduce((acc, r) => {
                  const key = r.publisher || "-";
                  if (!acc[key]) acc[key] = { revenue: 0, conversions: 0 };
                  acc[key].revenue += Number(r.publisher_revenue || 0);
                  acc[key].conversions += Number(r.publisher_verified || 0);
                  return acc;
                }, {});
                const top = Object.entries(grouped).sort((a,b) => b[1].revenue - a[1].revenue)[0];
                return top ? (
                  <div>
                    <div style={{color:"#f1f5f9", fontWeight:700, fontSize:14}}>{top[0]}</div>
                    <div style={{color:"#f59e0b", fontSize:13}}>${top[1].revenue.toFixed(2)} revenue · {top[1].conversions} conv</div>
                  </div>
                ) : <div style={{color:"#64748b"}}>No data</div>;
              })()}
            </div>
            {/* Best CR */}
            <div style={{background:"#1e293b", borderRadius:10, padding:"12px 16px", border:"1px solid rgba(255,255,255,0.06)"}}>
              <div style={{fontSize:11, color:"#64748b", fontWeight:700, textTransform:"uppercase", marginBottom:8}}>📊 Best CR% (min 5 requests)</div>
              {(() => {
                const rows = data.filter(r => Number(r.pin_req || 0) >= 5);
                const top = rows.sort((a,b) => Number(b.cr || 0) - Number(a.cr || 0))[0];
                return top ? (
                  <div>
                    <div style={{color:"#f1f5f9", fontWeight:700, fontSize:14}}>{top.offer || top.service_name || "-"}</div>
                    <div style={{color:"#8b5cf6", fontSize:13}}>{Number(top.cr || 0).toFixed(1)}% CR · {top.carrier} {top.geo}</div>
                  </div>
                ) : <div style={{color:"#64748b"}}>No data</div>;
              })()}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ fontSize: 13, color: "#94a3b8" }}>🕐 Timezone:</label>
          <select value={timezone} onChange={e => setTimezone(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "#1e293b", color: "#f1f5f9", fontSize: 13 }}>
            <option value="Asia/Kolkata">IST — India</option>
            <option value="Asia/Jerusalem">IST — Palestine</option>
            <option value="Asia/Baghdad">AST — Iraq / Kuwait / Saudi</option>
            <option value="Asia/Dubai">GST — UAE / Oman</option>
            <option value="Africa/Cairo">EET — Egypt</option>
            <option value="Asia/Amman">EET — Jordan</option>
            <option value="Europe/London">GMT — UK</option>
            <option value="UTC">UTC</option>
          </select>
        </div>

        <div style={filterBar}>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={filterInput} />
          <input type="date" value={to} onChange={e => setTo(e.target.value)} style={filterInput} />
          <select value={advertiser} onChange={e => setAdvertiser(e.target.value)} style={filterSelect}>
            <option value="">All Advertisers</option>
            {filters.advertisers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select value={publisher} onChange={e => setPublisher(e.target.value)} style={filterSelect}>
            <option value="">All Publishers</option>
            {filters.publishers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select value={geo} onChange={e => setGeo(e.target.value)} style={filterSelect}>
            <option value="">All Geo</option>
            {filters.geos.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={carrier} onChange={e => setCarrier(e.target.value)} style={filterSelect}>
            <option value="">All Carrier</option>
            {filters.carriers.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={offer} onChange={e => setOffer(e.target.value)} style={filterSelect}>
            <option value="">All Offers</option>
            {filters.offers.map(item => <option key={item.id} value={item.id}>{item.offer_name}</option>)}
          </select>
          <button onClick={loadReport} disabled={loading} style={applyBtn}>{loading ? "Loading..." : "Apply"}</button>
          <button onClick={exportCSV} style={exportBtn}>Export CSV</button>
          <button
            onClick={() => setAutoRefresh(v => !v)}
            style={{...exportBtn, background: autoRefresh ? "#16a34a" : "#64748b", color:"#fff", border:"none"}}>
            {autoRefresh ? "🔄 Auto ON" : "🔄 Auto OFF"}
          </button>
        </div>

        <div style={tableWrap}>
          {data.length === 0 && !loading ? (
            <div style={{textAlign:"center", padding:60, color:"#64748b", fontSize:15}}>
              📊 No data found for selected filters.
              <span style={{fontSize:12, marginTop:8, display:"block", color:"#475569"}}>Add advertisers, offers and publishers to get started.</span>
            </div>
          ) : (
            <div style={tableScroll}>
              <table style={{...table, minWidth:"100%", fontSize:13, tableLayout:"auto"}}>
                <thead>
                  <tr>
                    {view === "daily" && <th style={stickyTh}>Date</th>}
                    <th style={stickyTh}>Advertiser</th><th style={stickyTh}>Offer</th><th style={stickyTh}>Publisher</th>
                    <th style={stickyTh}>Geo</th><th style={stickyTh}>Carrier</th>
                    <th style={stickyTh}>CPA</th><th style={stickyTh}>Publisher CPA</th><th style={stickyTh}>Cap</th><th style={stickyTh}>Publisher Cap</th>
                    <th style={stickyTh}>Pin Req</th><th style={stickyTh}>Unique Req</th><th style={stickyTh}>Pin Sent</th><th style={stickyTh}>Unique Sent</th>
                    <th style={stickyTh}>Verify Req</th><th style={stickyTh}>Unique Verify</th><th style={stickyTh}>Verified</th><th style={stickyTh}>Publisher Verified</th>
                    <th style={stickyTh}>CR %</th><th style={stickyTh}>Publisher CR</th><th style={stickyTh}>Revenue</th><th style={stickyTh}>Publisher Revenue</th>
                    <th style={stickyTh}>Profit</th><th style={stickyTh}>Last Pin Gen</th><th style={stickyTh}>Last Verification</th><th style={stickyTh}>Last Success Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr key={`${row.offer_id || "offer"}-${row.publisher_id || "pub"}-${i}`}>
                      {view === "daily" && <td style={stickyTd}>{formatDateOnly(row.date)}</td>}
                      <td style={stickyTd}>{row.advertiser_name}</td><td style={stickyTd}>{row.offer_name}</td><td style={stickyTd}>{row.publisher_name}</td>
                      <td style={stickyTd}>{row.geo}</td><td style={stickyTd}>{row.carrier}</td><td style={stickyTd}>{row.cpa}</td><td style={stickyTd}>{row.publisher_cpa}</td>
                      <td style={stickyTd}>{row.cap}</td><td style={stickyTd}>{row.publisher_cap}</td><td style={stickyTd}>{row.pin_req}</td><td style={stickyTd}>{row.unique_req}</td>
                      <td style={stickyTd}>{row.pin_sent}</td><td style={stickyTd}>{row.unique_sent}</td><td style={stickyTd}>{row.verify_req}</td><td style={stickyTd}>{row.unique_verify}</td>
                      <td style={stickyTd}>{row.verified}</td><td style={stickyTd}>{row.publisher_verified}</td>
                      <td style={stickyTd}>(() => {
  const cr = toNumber(row.cr_percent);
  const color = cr >= 50 ? "#22c55e" : cr >= 20 ? "#f59e0b" : "#ef4444";
  return <span style={{color, fontWeight:700}}>{cr.toFixed(1)}%</span>;
})()%</td><td style={stickyTd}>(() => {
  const cr = toNumber(row.publisher_cr);
  const color = cr >= 50 ? "#22c55e" : cr >= 20 ? "#f59e0b" : "#ef4444";
  return <span style={{color, fontWeight:600}}>{cr.toFixed(1)}%</span>;
})()%</td>
                      <td style={stickyTd}>{money(row.revenue)}</td><td style={stickyTd}>{money(row.publisher_revenue)}</td>
                      <td style={{...stickyTd, color: toNumber(row.profit) >= 0 ? "#4ade80" : "#f87171", fontWeight:600}}>{money(row.profit)}</td>
                      <td style={stickyTd}>{formatDate(row.last_pin_gen, timezone)}</td><td style={stickyTd}>{formatDate(row.last_verification, timezone)}</td>
                      <td style={stickyTd}>{formatDate(row.last_success_verification, timezone)}</td>
                    </tr>
                  ))}
                  <tr style={totalRow}>
                    <td colSpan={view === "daily" ? 10 : 9} style={stickyTd}><b>TOTAL</b></td>
                    <td style={stickyTd}>{total.pin_req}</td><td style={stickyTd}>{total.unique_req}</td><td style={stickyTd}>{total.pin_sent}</td><td style={stickyTd}>{total.unique_sent}</td>
                    <td style={stickyTd}>{total.verify_req}</td><td style={stickyTd}>{total.unique_verify}</td><td style={stickyTd}>{total.verified}</td><td style={stickyTd}>{total.publisher_verified}</td>
                    <td style={stickyTd}>-</td><td style={stickyTd}>-</td><td style={stickyTd}>{money(total.revenue)}</td><td style={stickyTd}>{money(total.publisher_revenue)}</td>
                    <td style={{...stickyTd, color: total.profit >= 0 ? "#4ade80" : "#f87171", fontWeight:700}}>{money(total.profit)}</td>
                    <td colSpan="3" style={stickyTd} />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
