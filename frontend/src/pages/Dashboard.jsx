import { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";

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

const formatDate = (value) => {
  if (!value) return "-";
  if (typeof value === "string" && !value.includes("T") && !value.match(/^\d{4}-\d{2}-\d{2}$/)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:true }).format(parsed);
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
      // Sirf real errors dikhao, empty data pe nahi
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
      <div style={S.page}>
        <div style={S.glow1}/><div style={S.glow2}/>
        <div style={S.inner}>
          <h1 style={S.title}>Traffic Dashboard</h1>

          <div style={S.topRow}>
            <div style={S.viewTabs}>
              <button
                onClick={() => setView("summary")}
                style={{...S.tabBtn, ...(view==="summary" ? S.tabBtnActive : {})}}
              >Summary</button>
              <button
                onClick={() => setView("daily")}
                style={{...S.tabBtn, ...(view==="daily" ? S.tabBtnActive : {})}}
              >Daily</button>
            </div>

            <div style={S.statsRow}>
              <div style={{...S.statCard, borderLeft:"3px solid #3b82f6"}}>
                <div style={S.statLabel}>Requests</div>
                <div style={{...S.statValue, color:"#60a5fa"}}>{stats.total_requests || 0}</div>
              </div>
              <div style={{...S.statCard, borderLeft:"3px solid #22c55e"}}>
                <div style={S.statLabel}>OTP Sent</div>
                <div style={{...S.statValue, color:"#4ade80"}}>{stats.otp_sent || 0}</div>
              </div>
              <div style={{...S.statCard, borderLeft:"3px solid #f59e0b"}}>
                <div style={S.statLabel}>Conversions</div>
                <div style={{...S.statValue, color:"#fbbf24"}}>{stats.conversions || 0}</div>
              </div>
              <div style={{...S.statCard, borderLeft:"3px solid #8b5cf6"}}>
                <div style={S.statLabel}>Last Hour</div>
                <div style={{...S.statValue, color:"#a78bfa"}}>{stats.last_hour_requests || 0}</div>
              </div>
            </div>
          </div>

          {error ? <p style={S.errorText}>{error}</p> : null}

          <div style={S.filterBar}>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={S.input} />
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={S.input} />
            <select value={advertiser} onChange={e => setAdvertiser(e.target.value)} style={S.select}>
              <option value="">All Advertisers</option>
              {filters.advertisers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select value={publisher} onChange={e => setPublisher(e.target.value)} style={S.select}>
              <option value="">All Publishers</option>
              {filters.publishers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select value={geo} onChange={e => setGeo(e.target.value)} style={S.select}>
              <option value="">All Geo</option>
              {filters.geos.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={carrier} onChange={e => setCarrier(e.target.value)} style={S.select}>
              <option value="">All Carrier</option>
              {filters.carriers.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={offer} onChange={e => setOffer(e.target.value)} style={S.select}>
              <option value="">All Offers</option>
              {filters.offers.map(item => <option key={item.id} value={item.id}>{item.offer_name}</option>)}
            </select>
            <button onClick={loadReport} disabled={loading} style={S.applyBtn}>
              {loading ? "Loading..." : "Apply"}
            </button>
            <button onClick={exportCSV} style={S.exportBtn}>Export CSV</button>
          </div>

          <div style={S.tableWrap}>
            {data.length === 0 && !loading ? (
              <div style={S.emptyState}>
                📊 No data found for selected filters.
                <span style={S.emptySub}>Add advertisers, offers and publishers to get started.</span>
              </div>
            ) : (
              <div style={S.tableScroll}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      {view === "daily" && <th style={S.th}>Date</th>}
                      <th style={S.th}>Advertiser</th><th style={S.th}>Offer</th><th style={S.th}>Publisher</th>
                      <th style={S.th}>Geo</th><th style={S.th}>Carrier</th>
                      <th style={S.th}>CPA</th><th style={S.th}>Publisher CPA</th><th style={S.th}>Cap</th><th style={S.th}>Publisher Cap</th>
                      <th style={S.th}>Pin Req</th><th style={S.th}>Unique Req</th><th style={S.th}>Pin Sent</th><th style={S.th}>Unique Sent</th>
                      <th style={S.th}>Verify Req</th><th style={S.th}>Unique Verify</th><th style={S.th}>Verified</th><th style={S.th}>Publisher Verified</th>
                      <th style={S.th}>CR %</th><th style={S.th}>Publisher CR</th><th style={S.th}>Revenue</th><th style={S.th}>Publisher Revenue</th>
                      <th style={S.th}>Profit</th><th style={S.th}>Last Pin Gen</th><th style={S.th}>Last Verification</th><th style={S.th}>Last Success Verification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, i) => (
                      <tr key={`${row.offer_id || "offer"}-${row.publisher_id || "pub"}-${i}`} style={S.tr}>
                        {view === "daily" && <td style={S.td}>{formatDateOnly(row.date)}</td>}
                        <td style={S.td}>{row.advertiser_name}</td><td style={S.td}>{row.offer_name}</td><td style={S.td}>{row.publisher_name}</td>
                        <td style={S.td}>{row.geo}</td><td style={S.td}>{row.carrier}</td><td style={S.td}>{row.cpa}</td><td style={S.td}>{row.publisher_cpa}</td>
                        <td style={S.td}>{row.cap}</td><td style={S.td}>{row.publisher_cap}</td><td style={S.td}>{row.pin_req}</td><td style={S.td}>{row.unique_req}</td>
                        <td style={S.td}>{row.pin_sent}</td><td style={S.td}>{row.unique_sent}</td><td style={S.td}>{row.verify_req}</td><td style={S.td}>{row.unique_verify}</td>
                        <td style={S.td}>{row.verified}</td><td style={S.td}>{row.publisher_verified}</td>
                        <td style={S.td}>{row.cr_percent}%</td><td style={S.td}>{row.publisher_cr}%</td>
                        <td style={S.td}>{money(row.revenue)}</td><td style={S.td}>{money(row.publisher_revenue)}</td>
                        <td style={{...S.td, color: toNumber(row.profit) >= 0 ? "#4ade80" : "#f87171", fontWeight:600}}>{money(row.profit)}</td>
                        <td style={S.td}>{formatDate(row.last_pin_gen)}</td><td style={S.td}>{formatDate(row.last_verification)}</td>
                        <td style={S.td}>{formatDate(row.last_success_verification)}</td>
                      </tr>
                    ))}
                    <tr style={S.totalRow}>
                      <td colSpan={view === "daily" ? 10 : 9} style={S.td}><b>TOTAL</b></td>
                      <td style={S.td}>{total.pin_req}</td><td style={S.td}>{total.unique_req}</td><td style={S.td}>{total.pin_sent}</td><td style={S.td}>{total.unique_sent}</td>
                      <td style={S.td}>{total.verify_req}</td><td style={S.td}>{total.unique_verify}</td><td style={S.td}>{total.verified}</td><td style={S.td}>{total.publisher_verified}</td>
                      <td style={S.td}>-</td><td style={S.td}>-</td><td style={S.td}>{money(total.revenue)}</td><td style={S.td}>{money(total.publisher_revenue)}</td>
                      <td style={{...S.td, color: total.profit >= 0 ? "#4ade80" : "#f87171", fontWeight:700}}>{money(total.profit)}</td>
                      <td colSpan="3" style={S.td} />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const S = {
  page: { minHeight:"100vh", background:"#050810", padding:"24px 24px 60px", position:"relative", overflow:"hidden", fontFamily:"Lora, serif" },
  glow1: { position:"absolute", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(59,130,246,0.07) 0%,transparent 70%)", top:-200, left:-200, pointerEvents:"none" },
  glow2: { position:"absolute", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(139,92,246,0.07) 0%,transparent 70%)", bottom:-100, right:0, pointerEvents:"none" },
  inner: { maxWidth:"100%", margin:"0 auto", position:"relative", zIndex:1 },
  title: { color:"#cbd5e1", fontSize:24, fontWeight:700, marginBottom:18, fontFamily:"Syne,sans-serif" },

  topRow: { display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, marginBottom:18, flexWrap:"wrap" },

  viewTabs: { display:"flex", gap:8, flexShrink:0 },
  tabBtn: { padding:"9px 18px", borderRadius:10, border:"1px solid rgba(255,255,255,0.08)", background:"#0d1326", color:"#64748b", fontSize:13, fontWeight:600, cursor:"pointer" },
  tabBtnActive: { background:"#3b82f6", color:"#e2e8f0", border:"1px solid #3b82f6" },

  errorText: { color:"#f87171", fontSize:13, marginBottom:12 },

  statsRow: { display:"flex", gap:12, flexWrap:"wrap" },
  statCard: { background:"#0d1326", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"8px 16px", minWidth:110 },
  statLabel: { color:"#475569", fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:3 },
  statValue: { fontSize:18, fontWeight:700 },

  filterBar: { marginBottom:18, display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" },
  input: { background:"#0d1326", border:"1px solid rgba(255,255,255,0.08)", color:"#94a3b8", padding:"8px 12px", borderRadius:10, fontSize:13, colorScheme:"dark" },
  select: { background:"#0d1326", border:"1px solid rgba(255,255,255,0.08)", color:"#94a3b8", padding:"8px 12px", borderRadius:10, fontSize:13, cursor:"pointer" },
  applyBtn: { background:"#3b82f6", color:"#e2e8f0", border:"none", padding:"9px 20px", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer" },
  exportBtn: { background:"#0d1326", border:"1px solid rgba(255,255,255,0.08)", color:"#64748b", padding:"9px 20px", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer" },

  tableWrap: { background:"#0d1326", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, overflow:"hidden", width:"100%" },
  emptyState: { textAlign:"center", padding:60, color:"#64748b", fontSize:15 },
  emptySub: { fontSize:12, marginTop:8, display:"block", color:"#475569" },

  tableScroll: { overflowX:"auto", maxHeight:"70vh", overflowY:"auto" },
  table: { width:"100%", minWidth:"100%", borderCollapse:"collapse", fontSize:13, tableLayout:"auto" },
  th: { padding:"12px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:"1px solid rgba(255,255,255,0.08)", background:"#0a0f1e", whiteSpace:"nowrap", position:"sticky", top:0, zIndex:2 },
  td: { padding:"11px 16px", color:"#94a3b8", borderBottom:"1px solid rgba(255,255,255,0.04)", whiteSpace:"nowrap", fontSize:13 },
  tr: { transition:"background 0.15s" },
  totalRow: { background:"#0a0f1e" },
};
