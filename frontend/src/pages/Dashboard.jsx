import { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { page, badge } from "../styles/shared.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

const todayIST = () => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year:"numeric", month:"2-digit", day:"2-digit" }).formatToParts(new Date());
  return `${parts.find(p=>p.type==="year")?.value}-${parts.find(p=>p.type==="month")?.value}-${parts.find(p=>p.type==="day")?.value}`;
};

const fmt = (v) => { if(!v) return "-"; const [y,m,d]=String(v).slice(0,10).split("-"); return `${d}/${m}/${y}`; };
const fmtDT = (v) => { if(!v) return "-"; const s=String(v).replace("T"," ").replace("Z","").split(".")[0]; const [dt,t]=s.split(" "); if(!dt||!t) return "-"; const [y,m,d]=dt.split("-"); return `${d}/${m}/${y} ${t}`; };

export default function Dashboard() {
  const token = localStorage.getItem("token");
  const today = todayIST();

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [view, setView] = useState("summary");
  const [rows, setRows] = useState([]);
  const [realtime, setRealtime] = useState({});
  const [filters, setFilters] = useState({ advertisers:[], publishers:[], offers:[], geos:[], carriers:[] });
  const [fAdv, setFAdv] = useState("");
  const [fPub, setFPub] = useState("");
  const [fOffer, setFOffer] = useState("");
  const [fGeo, setFGeo] = useState("");
  const [fCarrier, setFCarrier] = useState("");
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const loadFilters = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/dashboard/filters`, { headers });
    const data = await res.json();
    if (data.status === "SUCCESS") setFilters(data);
  }, []);

  const loadRealtime = useCallback(async () => {
    const qs = new URLSearchParams({ from, to });
    const res = await fetch(`${API_BASE}/api/dashboard/realtime?${qs}`, { headers });
    const data = await res.json();
    if (data.status === "SUCCESS") setRealtime(data.data || {});
  }, [from, to]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ from, to, view });
    if (fAdv) qs.set("advertiser", fAdv);
    if (fPub) qs.set("publisher", fPub);
    if (fOffer) qs.set("offer_id", fOffer);
    if (fGeo) qs.set("geo", fGeo);
    if (fCarrier) qs.set("carrier", fCarrier);
    const res = await fetch(`${API_BASE}/api/dashboard/report?${qs}`, { headers });
    const data = await res.json();
    if (data.status === "SUCCESS") setRows(data.data || []);
    setLoading(false);
  }, [from, to, view, fAdv, fPub, fOffer, fGeo, fCarrier]);

  useEffect(() => { loadFilters(); loadRealtime(); loadReport(); }, []);

  const totals = useMemo(() => rows.reduce((a,r) => {
    a.pin_req += Number(r.pin_req||0);
    a.pin_sent += Number(r.pin_sent||0);
    a.verified += Number(r.verified||0);
    a.pub_verified += Number(r.publisher_verified||0);
    a.revenue += Number(r.revenue||0);
    a.pub_revenue += Number(r.publisher_revenue||0);
    a.profit += Number(r.profit||0);
    return a;
  }, {pin_req:0,pin_sent:0,verified:0,pub_verified:0,revenue:0,pub_revenue:0,profit:0}), [rows]);

  const statCards = [
    { label:"Total Requests", value: realtime.total_requests||0, icon:"📡", color:"#3b82f6" },
    { label:"OTP Sent", value: realtime.otp_sent||0, icon:"📤", color:"#6366f1" },
    { label:"Conversions", value: realtime.conversions||0, icon:"✅", color:"#22c55e" },
    { label:"Last Hour", value: realtime.last_hour_requests||0, icon:"⚡", color:"#f59e0b" },
  ];

  const cols = [
    ...(view==="daily"?[{k:"date",l:"Date"}]:[]),
    {k:"advertiser_name",l:"Advertiser"},{k:"offer_name",l:"Offer"},
    {k:"publisher_name",l:"Publisher"},{k:"geo",l:"Geo"},{k:"carrier",l:"Carrier"},
    {k:"pin_req",l:"Pin Req"},{k:"pin_sent",l:"Sent"},{k:"verify_req",l:"Verify"},
    {k:"verified",l:"Verified"},{k:"publisher_verified",l:"Pub Verified"},
    {k:"cr_percent",l:"CR%"},{k:"publisher_cr",l:"Pub CR%"},
    {k:"revenue",l:"Revenue"},{k:"publisher_revenue",l:"Pub Rev"},{k:"profit",l:"Profit"},
    {k:"last_pin_gen",l:"Last Pin"},{k:"last_success_verification",l:"Last Success"},
  ];

  return (
    <>
      <Navbar />
      <div style={page}>
        <div style={S.header}>
          <div>
            <h1 style={S.title}>Dashboard</h1>
            <p style={S.sub}>Real-time performance overview</p>
          </div>
          <button style={S.refreshBtn} onClick={()=>{ loadRealtime(); loadReport(); }}>↻ Refresh</button>
        </div>

        {/* STAT CARDS */}
        <div style={S.statsGrid}>
          {statCards.map(c=>(
            <div key={c.label} style={S.statCard}>
              <div style={{...S.statIcon, background:`${c.color}18`, color:c.color}}>{c.icon}</div>
              <div>
                <div style={{...S.statValue, color:c.color}}>{Number(c.value).toLocaleString()}</div>
                <div style={S.statLabel}>{c.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* FILTERS */}
        <div style={S.filterCard}>
          <div style={S.filterRow}>
            <div style={S.filterGroup}>
              <label style={S.filterLabel}>From</label>
              <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={S.filterInput} />
            </div>
            <div style={S.filterGroup}>
              <label style={S.filterLabel}>To</label>
              <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={S.filterInput} />
            </div>
            <div style={S.filterGroup}>
              <label style={S.filterLabel}>View</label>
              <select value={view} onChange={e=>setView(e.target.value)} style={S.filterSelect}>
                <option value="summary">Summary</option>
                <option value="daily">Daily</option>
              </select>
            </div>
            <div style={S.filterGroup}>
              <label style={S.filterLabel}>Advertiser</label>
              <select value={fAdv} onChange={e=>setFAdv(e.target.value)} style={S.filterSelect}>
                <option value="">All</option>
                {filters.advertisers.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div style={S.filterGroup}>
              <label style={S.filterLabel}>Publisher</label>
              <select value={fPub} onChange={e=>setFPub(e.target.value)} style={S.filterSelect}>
                <option value="">All</option>
                {filters.publishers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={S.filterGroup}>
              <label style={S.filterLabel}>Offer</label>
              <select value={fOffer} onChange={e=>setFOffer(e.target.value)} style={S.filterSelect}>
                <option value="">All</option>
                {filters.offers.map(o=><option key={o.id} value={o.id}>{o.offer_name}</option>)}
              </select>
            </div>
            <div style={S.filterGroup}>
              <label style={S.filterLabel}>Geo</label>
              <select value={fGeo} onChange={e=>setFGeo(e.target.value)} style={S.filterSelect}>
                <option value="">All</option>
                {filters.geos.map(g=><option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div style={S.filterGroup}>
              <label style={S.filterLabel}>Carrier</label>
              <select value={fCarrier} onChange={e=>setFCarrier(e.target.value)} style={S.filterSelect}>
                <option value="">All</option>
                {filters.carriers.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button style={S.applyBtn} onClick={loadReport}>Apply</button>
          </div>
        </div>

        {/* TOTALS */}
        <div style={S.totalsRow}>
          {[
            {l:"Total Revenue",v:`$${totals.revenue.toFixed(2)}`,c:"#22c55e"},
            {l:"Pub Revenue",v:`$${totals.pub_revenue.toFixed(2)}`,c:"#3b82f6"},
            {l:"Profit",v:`$${totals.profit.toFixed(2)}`,c:"#f59e0b"},
            {l:"Verified",v:totals.verified,c:"#6366f1"},
            {l:"Pub Verified",v:totals.pub_verified,c:"#8b5cf6"},
          ].map(t=>(
            <div key={t.l} style={S.totalItem}>
              <div style={{...S.totalValue,color:t.c}}>{t.v}</div>
              <div style={S.totalLabel}>{t.l}</div>
            </div>
          ))}
        </div>

        {/* TABLE */}
        <div style={S.tableWrap}>
          {loading ? (
            <div style={S.loading}>Loading...</div>
          ) : (
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{background:"#0a0f1e"}}>
                    {cols.map(c=>(
                      <th key={c.k} style={S.th}>{c.l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r,i)=>(
                    <tr key={i} style={{background:i%2===0?"#0d1326":"#0a0f1e"}}>
                      {cols.map(c=>(
                        <td key={c.k} style={S.td}>
                          {c.k==="cr_percent"||c.k==="publisher_cr" ? `${r[c.k]||0}%` :
                           c.k==="revenue"||c.k==="publisher_revenue"||c.k==="profit" ? `$${Number(r[c.k]||0).toFixed(2)}` :
                           c.k==="date"||c.k==="last_pin_gen"||c.k==="last_success_verification" ? (r[c.k]?fmtDT(r[c.k]):"-") :
                           c.k==="geo"||c.k==="carrier" ? <span style={badge("blue")}>{r[c.k]||"-"}</span> :
                           r[c.k]||"-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!rows.length&&<tr><td colSpan={cols.length} style={{textAlign:"center",padding:60,color:"#475569"}}>No data for selected period</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const S = {
  header: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:32 },
  title: { fontFamily:"Syne,sans-serif", fontSize:28, fontWeight:700, color:"#f1f5f9" },
  sub: { color:"#475569", fontSize:13, marginTop:4 },
  refreshBtn: { padding:"10px 20px", borderRadius:10, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.04)", color:"#94a3b8", cursor:"pointer", fontSize:13, fontWeight:500 },
  statsGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:24 },
  statCard: { background:"#0d1326", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:20, display:"flex", alignItems:"center", gap:16 },
  statIcon: { width:44, height:44, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 },
  statValue: { fontSize:28, fontWeight:700, fontFamily:"Syne,sans-serif", lineHeight:1 },
  statLabel: { fontSize:12, color:"#475569", marginTop:4 },
  filterCard: { background:"#0d1326", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:20, marginBottom:20 },
  filterRow: { display:"flex", flexWrap:"wrap", gap:12, alignItems:"flex-end" },
  filterGroup: { display:"flex", flexDirection:"column", gap:6 },
  filterLabel: { fontSize:11, fontWeight:600, color:"#475569", textTransform:"uppercase", letterSpacing:"0.06em" },
  filterInput: { padding:"8px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.08)", background:"#111827", color:"#f1f5f9", fontSize:13, outline:"none" },
  filterSelect: { padding:"8px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.08)", background:"#111827", color:"#f1f5f9", fontSize:13, outline:"none" },
  applyBtn: { padding:"9px 24px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#3b82f6,#6366f1)", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", alignSelf:"flex-end" },
  totalsRow: { display:"flex", flexWrap:"wrap", gap:12, marginBottom:20 },
  totalItem: { background:"#0d1326", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"14px 20px", flex:1, minWidth:140 },
  totalValue: { fontSize:22, fontWeight:700, fontFamily:"Syne,sans-serif" },
  totalLabel: { fontSize:11, color:"#475569", marginTop:4, textTransform:"uppercase", letterSpacing:"0.06em" },
  tableWrap: { background:"#0d1326", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, overflow:"hidden" },
  loading: { textAlign:"center", padding:60, color:"#475569" },
  th: { padding:"12px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#475569", textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid rgba(255,255,255,0.07)", whiteSpace:"nowrap" },
  td: { padding:"12px 16px", fontSize:12, color:"#94a3b8", borderBottom:"1px solid rgba(255,255,255,0.04)", whiteSpace:"nowrap" },
};
