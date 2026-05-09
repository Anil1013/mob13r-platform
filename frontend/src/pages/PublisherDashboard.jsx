import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";

const API_BASE = import.meta.env.VITE_API_BASE || "https://backend.mob13r.com";

const todayIST = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  return `${parts.find(p=>p.type==="year")?.value}-${parts.find(p=>p.type==="month")?.value}-${parts.find(p=>p.type==="day")?.value}`;
};

const fmt = (v) => { if (!v) return "-"; const [y,m,d]=String(v).slice(0,10).split("-"); return `${d}/${m}/${y}`; };
const fmtDT = (v) => { if (!v) return "-"; const s=String(v).replace("T"," ").replace("Z","").split(".")[0]; const [dt,t]=s.split(" "); if(!dt||!t) return "-"; const [y,m,d]=dt.split("-"); return `${d}/${m}/${y}, ${t}`; };
const hrLabel = (h) => { if (!h) return "-"; const hh=String(h).slice(11,13); if(!hh||isNaN(Number(hh))) return "-"; const n=String((Number(hh)+1)%24).padStart(2,"0"); return `${hh}:00 - ${n}:00`; };

export default function PublisherDashboard() {
  const today = todayIST();
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

  if (loading) return <p style={{padding:20}}>Loading...</p>;

  return (
    <>
      <Navbar />
      <div style={{padding:20}}>
        <h2>Publisher Dashboard - <span style={{color:"#2563eb"}}>{publisherName}</span></h2>
        {error && <div style={{background:"#fee2e2",border:"1px solid #ef4444",borderRadius:6,padding:"10px 16px",marginBottom:12,color:"#b91c1c",fontWeight:500}}>{error}</div>}
        <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
          <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} />
          <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} />
          <button onClick={fetchData}>Apply</button>
          <select value={filterOffer} onChange={e=>setFilterOffer(e.target.value)}>
            <option value="">All Offers</option>{offerOptions.map(o=><option key={o}>{o}</option>)}
          </select>
          <select value={filterGeo} onChange={e=>setFilterGeo(e.target.value)}>
            <option value="">All Geo</option>{geoOptions.map(g=><option key={g}>{g}</option>)}
          </select>
          <select value={filterCarrier} onChange={e=>setFilterCarrier(e.target.value)}>
            <option value="">All Carrier</option>{carrierOptions.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={{overflowX:"auto"}}>
        <table border="1" cellPadding="8" width="100%" style={{textAlign:"center",minWidth:1200}}>
          <thead><tr>{["Date","Offer","Geo","Carrier","CPA","Cap","Pin Req","Unique Req","Pin Sent","Unique Sent","Verify Req","Unique Verify","Verified","CR %","Revenue","Last Pin Gen","Last Verification","Last Success"].map(h=><th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {filteredRows.map((r,i)=>(
              <tr key={i}>
                <td>{fmt(r.stat_date)}</td>
                <td><button onClick={()=>openHourly(r)}>{r.offer}</button></td>
                <td>{r.geo}</td><td>{r.carrier}</td><td>{r.cpa}</td><td>{r.cap}</td>
                <td>{r.pin_request_count}</td><td>{r.unique_pin_request_count}</td>
                <td>{r.pin_send_count}</td><td>{r.unique_pin_sent}</td>
                <td>{r.pin_validation_request_count}</td><td>{r.unique_pin_validation_request_count}</td>
                <td>{r.unique_pin_verified}</td><td>{r.cr}%</td><td>${r.revenue}</td>
                <td>{fmtDT(r.last_pin_gen_date)}</td>
                <td>{fmtDT(r.last_pin_verification_date)}</td>
                <td>{fmtDT(r.last_success_pin_verification_date)}</td>
              </tr>
            ))}
            <tr style={{fontWeight:"bold",background:"#f3f4f6"}}>
              <td colSpan="6">TOTAL</td>
              <td>{totals.pin}</td><td>{totals.uReq}</td><td>{totals.sent}</td><td>{totals.uSent}</td>
              <td>{totals.vReq}</td><td>{totals.uVer}</td><td>{totals.ver}</td>
              <td></td><td>${totals.rev.toFixed(2)}</td><td colSpan="3"></td>
            </tr>
          </tbody>
        </table>
        </div>
        {hourlyOpen && (
          <div style={{marginTop:25}}>
            <h3>Hourly - {hourlyMeta.offer} ({fmt(hourlyMeta.stat_date)}) <button onClick={()=>setHourlyOpen(false)}>X</button></h3>
            <table border="1" cellPadding="8" style={{textAlign:"center"}}>
              <thead><tr>{["Hour","Unique Req","Unique Sent","Verify Req","Verified","Revenue"].map(h=><th key={h}>{h}</th>)}</tr></thead>
              <tbody>{hourlyRows.map((h,i)=><tr key={i}><td>{hrLabel(h.hour)}</td><td>{h.unique_pin_requests}</td><td>{h.unique_pin_sent}</td><td>{h.unique_pin_verification_requests}</td><td>{h.pin_verified}</td><td>${h.revenue}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
