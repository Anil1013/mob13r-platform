import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { DatePickerField } from "../components/DateRangePicker.jsx";
import { btn, input, table, th, td, page, statRow, statCard, statLabel, statValue } from "../styles/shared.js";

const API_BASE = import.meta.env.VITE_API_BASE || "https://backend.mob13r.com";

const todayIST = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  return `${parts.find(p=>p.type==="year")?.value}-${parts.find(p=>p.type==="month")?.value}-${parts.find(p=>p.type==="day")?.value}`;
};

const fmt = (v) => { if (!v) return "-"; const [y,m,d]=String(v).slice(0,10).split("-"); return `${d}/${m}/${y}`; };
const fmtDT = (v, tz = "Asia/Kolkata") => {
  if (!v) return "-";
  try {
    const date = new Date(v);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-IN", {
      timeZone: tz,
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: true
    });
  } catch { return "-"; }
};
const hrLabel = (h) => { if (!h) return "-"; const hh=String(h).slice(11,13); if(!hh||isNaN(Number(hh))) return "-"; const n=String((Number(hh)+1)%24).padStart(2,"0"); return `${hh}:00 - ${n}:00`; };

function exportPublisherCSV(rows, fromDate, toDate) {
  if (!rows.length) return alert("No data to export");
  const headers = ["Date","Offer","Geo","Carrier","CPA","CAP","PIN REQ","Unique REQ","PIN SENT","Unique SENT","Verify REQ","Unique Verify","Verified","CR%","Revenue","Last Pin Gen","Last Verification","Last Success"];
  const keys = ["stat_date","offer","geo","carrier","cpa","cap","pin_request_count","unique_pin_request_count","pin_send_count","unique_pin_sent","pin_validation_request_count","unique_pin_validation_request_count","unique_pin_verified","cr","revenue","last_pin_gen_date","last_pin_verification_date","last_success_pin_verification_date"];
  const csv = [
    headers.join(","),
    ...rows.map(r => keys.map(k => `"${String(r[k] ?? "").replace(/"/g,'""')}"`).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `publisher_report_${fromDate}_${toDate}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

const pillStyle = { display: "inline-block", padding: "3px 12px", borderRadius: 20, background: "#f8fafc", color: "#334155", fontWeight: 600, fontSize: 12, fontFamily: "'Lora',serif", border: "1px solid #e2e8f0" };

export default function PublisherDashboard() {
  const today = todayIST();
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [rows, setRows] = useState([]);
  const [publisherName, setPublisherName] = useState("");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [filterOffer, setFilterOffer] = useState("");
  const [filterGeo, setFilterGeo] = useState("");
  const [filterCarrier, setFilterCarrier] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hourlyOpen, setHourlyOpen] = useState(false);
  const [hourlyRows, setHourlyRows] = useState([]);
  const [hourlyMeta, setHourlyMeta] = useState(null);

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const key = localStorage.getItem("publisher_key") || localStorage.getItem("token");
      if (!key) { setError("Auth key missing. Please login again."); setLoading(false); return; }
      const qs = new URLSearchParams({ from: fromDate, to: toDate });
      const res = await fetch(`${API_BASE}/api/publisher/dashboard/offers?${qs}`, { headers: { "x-api-key": key } });
      if (res.status === 401) { setError("Unauthorized. Please login again."); setRows([]); setLoading(false); return; }
      const data = await res.json();
      if (data.status === "FAILED" || data.status === "UNAUTHORIZED") { setError(data.message || "Failed to load data"); setRows([]); }
      else { setRows(data.rows || []); setPublisherName(data.publisher?.name || ""); }
    } catch { setError("Network error. Please try again."); setRows([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const offerOptions = [...new Set(rows.map(r => r.offer))];
  const geoOptions = [...new Set(rows.map(r => r.geo))];
  const carrierOptions = [...new Set(rows.map(r => r.carrier))];

  const filteredRows = rows.filter(r => {
    if (filterOffer && r.offer !== filterOffer) return false;
    if (filterGeo && r.geo !== filterGeo) return false;
    if (filterCarrier && r.carrier !== filterCarrier) return false;
    return true;
  });

  const totals = useMemo(() => filteredRows.reduce((a,r) => {
    a.pin+=Number(r.pin_request_count||0); a.uReq+=Number(r.unique_pin_request_count||0);
    a.sent+=Number(r.pin_send_count||0); a.uSent+=Number(r.unique_pin_sent||0);
    a.vReq+=Number(r.pin_validation_request_count||0); a.uVer+=Number(r.unique_pin_validation_request_count||0);
    a.ver+=Number(r.unique_pin_verified||0); a.rev+=Number(r.revenue||0); return a;
  }, {pin:0,uReq:0,sent:0,uSent:0,vReq:0,uVer:0,ver:0,rev:0}), [filteredRows]);

  const avgCr = totals.uReq ? ((totals.ver / totals.uReq) * 100).toFixed(2) : "0.00";

  const openHourly = async (row) => {
    try {
      const key = localStorage.getItem("publisher_key") || localStorage.getItem("token");
      if (!key) { alert("Auth key missing."); return; }
      const qs = new URLSearchParams({ from: String(row.stat_date).slice(0,10), to: String(row.stat_date).slice(0,10) });
      const res = await fetch(`${API_BASE}/api/publisher/dashboard/offers/${row.publisher_offer_id}/hourly?${qs}`, { headers: { "x-api-key": key } });
      const data = await res.json();
      setHourlyRows([...(data.rows||[])].sort((a,b)=>String(a.hour||"").localeCompare(String(b.hour||""))));
      setHourlyMeta(row); setHourlyOpen(true);
    } catch { alert("Failed to load hourly data"); }
  };

  if (loading) return (
    <>
      <Navbar />
      <div style={page}>
        <div style={{ padding: 60, textAlign: "center" }}>
          <span className="m13-spinner" />
          <div style={{ marginTop: 10, color: "#a888b3", fontSize: 13, fontFamily: "'Lora',serif" }}>Loading dashboard...</div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Navbar />
      <div style={page} className="m13-fade-in">
        <h2 style={{fontFamily:"'Lora',serif",fontSize:26,fontWeight:800,color:"#2d1b30",marginBottom:4,letterSpacing:"-0.01em"}}>
          Publisher Dashboard
        </h2>
        <div style={{ color: "#a888b3", fontSize: 13, marginBottom: 20, fontFamily: "'Lora',serif" }}>
          {publisherName ? <>Reporting for <strong style={{ color: "#7c3aed" }}>{publisherName}</strong></> : "Loading publisher info..."}
        </div>

        {error && (
          <div style={{background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:12,padding:"10px 16px",marginBottom:16,color:"#dc2626",fontWeight:500,fontSize:13,fontFamily:"'Lora',serif"}}>
            {error}
          </div>
        )}

        {/* STATS */}
        <div style={{...statRow, marginBottom: 20}}>
          <div style={statCard}><div style={statLabel}>Pin Requests</div><div style={statValue}>{totals.uReq}</div></div>
          <div style={statCard}><div style={statLabel}>Pin Sent</div><div style={statValue}>{totals.uSent}</div></div>
          <div style={statCard}><div style={statLabel}>Verified</div><div style={{...statValue, color:"#16a34a"}}>{totals.ver}</div></div>
          <div style={statCard}><div style={statLabel}>Avg CR%</div><div style={statValue}>{avgCr}%</div></div>
          <div style={statCard}><div style={statLabel}>Revenue</div><div style={{...statValue, color:"#16a34a"}}>${totals.rev.toFixed(2)}</div></div>
        </div>

        {/* TIMEZONE SELECTOR */}
        <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ color: "#8b6a9a", fontSize: 13, fontFamily: "'Lora',serif" }}>🕐 Timezone:</label>
          <select value={timezone} onChange={e => setTimezone(e.target.value)}
            style={{ padding: "8px 14px", borderRadius: 11, border: "1.5px solid #ecdde6", background: "#fff", color: "#3d2436", fontSize: 13, fontFamily: "'Lora',serif", cursor: "pointer" }}>
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

        <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
          <DatePickerField value={fromDate} onChange={setFromDate} style={{...input,width:130}} />
          <DatePickerField value={toDate} onChange={setToDate} style={{...input,width:130}} />
          <button className="m13-btn" onClick={fetchData} style={btn}>Apply</button>
          <button className="m13-btn" style={{...btn, background:"linear-gradient(135deg,#16a34a,#22c55e)"}} onClick={() => exportPublisherCSV(filteredRows, fromDate, toDate)}>⬇ Export CSV</button>
          <select value={filterOffer} onChange={e=>setFilterOffer(e.target.value)} style={{...input,width:"auto"}}>
            <option value="">All Offers</option>{offerOptions.map(o=><option key={o}>{o}</option>)}
          </select>
          <select value={filterGeo} onChange={e=>setFilterGeo(e.target.value)} style={{...input,width:"auto"}}>
            <option value="">All Geo</option>{geoOptions.map(g=><option key={g}>{g}</option>)}
          </select>
          <select value={filterCarrier} onChange={e=>setFilterCarrier(e.target.value)} style={{...input,width:"auto"}}>
            <option value="">All Carrier</option>{carrierOptions.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>

        <div style={{background:"#ffffff",border:"1px solid #f0e5ec",borderRadius:18,overflow:"hidden",boxShadow:"0 8px 30px rgba(124,58,237,0.09), 0 2px 6px rgba(0,0,0,0.03)"}}>
          {filteredRows.length === 0 ? (
            <div style={{ padding: 50, textAlign: "center" }}>
              <div style={{ fontSize: 28, opacity: 0.5, marginBottom: 6 }}>📊</div>
              <div style={{ color: "#a888b3", fontSize: 13, fontFamily: "'Lora',serif" }}>No data for this range.</div>
            </div>
          ) : (
          <div style={{overflowX:"auto"}}>
            <table style={{...table,minWidth:1200}}>
              <thead>
                <tr>{["Date","Offer","Geo","Carrier","CPA","Cap","Pin Req","Unique Req","Pin Sent","Unique Sent","Verify Req","Unique Verify","Verified","CR %","Revenue","Last Pin Gen","Last Verification","Last Success"].map(h=><th key={h} style={{...th, whiteSpace:"nowrap"}}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filteredRows.map((r,i)=>(
                  <tr key={i} className="m13-row-hover">
                    <td style={{...td, whiteSpace:"nowrap"}}>{fmt(r.stat_date)}</td>
                    <td style={{...td, whiteSpace:"nowrap"}}><button onClick={()=>openHourly(r)} style={{background:"none",border:"none",color:"#7c3aed",cursor:"pointer",fontWeight:700,padding:0,fontFamily:"'Lora',serif"}}>{r.offer}</button></td>
                    <td style={td}><span style={pillStyle}>{r.geo}</span></td>
                    <td style={td}><span style={pillStyle}>{r.carrier}</span></td>
                    <td style={{...td, whiteSpace:"nowrap"}}>{r.cpa}</td><td style={{...td, whiteSpace:"nowrap"}}>{r.cap}</td>
                    <td style={{...td, whiteSpace:"nowrap"}}>{r.pin_request_count}</td><td style={{...td, whiteSpace:"nowrap"}}>{r.unique_pin_request_count}</td>
                    <td style={{...td, whiteSpace:"nowrap"}}>{r.pin_send_count}</td><td style={{...td, whiteSpace:"nowrap"}}>{r.unique_pin_sent}</td>
                    <td style={{...td, whiteSpace:"nowrap"}}>{r.pin_validation_request_count}</td><td style={{...td, whiteSpace:"nowrap"}}>{r.unique_pin_validation_request_count}</td>
                    <td style={{...td, whiteSpace:"nowrap", fontWeight:700, color:"#16a34a"}}>{r.unique_pin_verified}</td>
                    <td style={{...td, whiteSpace:"nowrap"}}>{r.cr}%</td>
                    <td style={{...td, whiteSpace:"nowrap", fontWeight:700, color:"#16a34a"}}>${r.revenue}</td>
                    <td style={{...td, whiteSpace:"nowrap", fontSize:12, color:"#8b6a9a"}}>{fmtDT(r.last_pin_gen_date, timezone)}</td>
                    <td style={{...td, whiteSpace:"nowrap", fontSize:12, color:"#8b6a9a"}}>{fmtDT(r.last_pin_verification_date, timezone)}</td>
                    <td style={{...td, whiteSpace:"nowrap", fontSize:12, color:"#8b6a9a"}}>{fmtDT(r.last_success_pin_verification_date)}</td>
                  </tr>
                ))}
                <tr style={{fontWeight:"bold",background:"linear-gradient(135deg,#faf0f6,#f5ebf9)"}}>
                  <td style={td} colSpan="6">TOTAL</td>
                  <td style={td}>{totals.pin}</td><td style={td}>{totals.uReq}</td><td style={td}>{totals.sent}</td><td style={td}>{totals.uSent}</td>
                  <td style={td}>{totals.vReq}</td><td style={td}>{totals.uVer}</td><td style={{...td, color:"#16a34a"}}>{totals.ver}</td>
                  <td style={td}></td><td style={{...td, color:"#16a34a"}}>${totals.rev.toFixed(2)}</td><td style={td} colSpan="3"></td>
                </tr>
              </tbody>
            </table>
          </div>
          )}
        </div>

        {hourlyOpen && (
          <div style={{marginTop:24,background:"#ffffff",border:"1px solid #f0e5ec",borderRadius:18,padding:22,boxShadow:"0 8px 30px rgba(124,58,237,0.09), 0 2px 6px rgba(0,0,0,0.03)"}}>
            <h3 style={{color:"#2d1b30",fontSize:16,fontWeight:700,marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",fontFamily:"'Lora',serif"}}>
              <span>Hourly — {hourlyMeta.offer} ({fmt(hourlyMeta.stat_date)})</span>
              <button onClick={()=>setHourlyOpen(false)} style={{background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",borderRadius:10,padding:"5px 12px",cursor:"pointer",fontSize:13,fontFamily:"'Lora',serif"}}>✕ Close</button>
            </h3>
            <div style={{overflowX:"auto"}}>
              <table style={table}>
                <thead><tr>{["Hour","Unique Req","Unique Sent","Verify Req","Verified","Revenue"].map(h=><th key={h} style={{...th, whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
                <tbody>{hourlyRows.map((h,i)=>(
                  <tr key={i} className="m13-row-hover">
                    <td style={{...td, whiteSpace:"nowrap"}}>{hrLabel(h.hour)}</td><td style={{...td, whiteSpace:"nowrap"}}>{h.unique_pin_requests}</td><td style={{...td, whiteSpace:"nowrap"}}>{h.unique_pin_sent}</td>
                    <td style={{...td, whiteSpace:"nowrap"}}>{h.unique_pin_verification_requests}</td><td style={{...td, whiteSpace:"nowrap", color:"#16a34a", fontWeight:700}}>{h.pin_verified}</td><td style={{...td, whiteSpace:"nowrap", color:"#16a34a", fontWeight:700}}>${h.revenue}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
