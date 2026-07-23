import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { btn, btnRed, input, table, th, td, page } from "../styles/shared.js";

/* ================= CONFIG ================= */
const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

function formatCellValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function parseIstDate(createdIst) {
  if (!createdIst || typeof createdIst !== "string") return null;

  const [datePart] = createdIst.split(",");
  if (!datePart) return null;

  const [dd, mm, yyyy] = datePart.split("/");
  if (!dd || !mm || !yyyy) return null;

  const parsedDate = new Date(`${yyyy}-${mm}-${dd}`);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

/* ================= CSV EXPORT ================= */
function statusBadge(status) {
  const colors = {
    VERIFIED: { bg: "#dcfce7", color: "#16a34a" },
    OTP_SENT: { bg: "#dbeafe", color: "#1d4ed8" },
    OTP_FAILED: { bg: "#fee2e2", color: "#dc2626" },
    OTP_INVALID: { bg: "#fef9c3", color: "#854d0e" },
    CAP_REACHED: { bg: "#f3e8ff", color: "#7c3aed" },
    SCRUBBED: { bg: "#f1f5f9", color: "#64748b" },
  };
  const c = colors[status] || { bg: "#f1f5f9", color: "#64748b" };
  return <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: c.bg, color: c.color }}>{status}</span>;
}

function exportCSV(rows) {
  if (!rows.length) return alert("No data to export");

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(row =>
      headers
        .map(header =>
          `"${formatCellValue(row[header]).replace(/"/g, '""')}"`
        )
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `dump_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/* ================= JSON VIEW ================= */
const renderJSON = data => (
  <pre style={{ maxHeight: 130, overflow: "auto", background:"#0a0f1e", color:"#94a3b8", padding:8, borderRadius:8, fontSize:11, margin:0 }}>
    {data ? JSON.stringify(data, null, 2) : "-"}
  </pre>
);

export default function DumpDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= FILTER STATES ================= */
  const [msisdn, setMsisdn] = useState("");
  const [offer, setOffer] = useState("");
  const [publisher, setPublisher] = useState("");
  const [advertiser, setAdvertiser] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 100;

  /* ================= FETCH ================= */
  useEffect(() => { fetchData(); }, [page]);

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const params = new URLSearchParams();
    if (msisdn) params.set("msisdn", msisdn);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    params.set("limit", PAGE_SIZE);
    params.set("offset", page * PAGE_SIZE);
    try {
      const res = await fetch(`${API_BASE}/api/dashboard/dump?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.message || "Failed");
      setRows(Array.isArray(d?.data) ? d.data : []);
      setTotal(d.total || 0);
    } catch(e) { setError(e.message || "Failed to load dump"); }
    setLoading(false);
  };

  /* ================= FILTER LOGIC ================= */
  const applyFilters = () => { setPage(0); fetchData(); };

  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      if (msisdn && !row.msisdn?.includes(msisdn)) return false;
      if (offer && !row.offer_name?.toLowerCase().includes(offer.toLowerCase()))
        return false;
      if (
        publisher &&
        !row.publisher_name?.toLowerCase().includes(publisher.toLowerCase())
      )
        return false;
      if (
        advertiser &&
        !row.advertiser_name?.toLowerCase().includes(advertiser.toLowerCase())
      )
        return false;

      const createdDate = parseIstDate(row.created_ist);
      if ((fromDate || toDate) && !createdDate) return false;

      if (fromDate && createdDate < new Date(fromDate)) return false;

      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (createdDate > end) return false;
      }

      return true;
    });
  }, [rows, msisdn, offer, publisher, advertiser, fromDate, toDate]);

  if (loading) return (
    <>
      <Navbar />
      <div style={page}><p style={{color:"#94a3b8"}}>Loading dump logs…</p></div>
    </>
  );
  if (error) return (
    <>
      <Navbar />
      <div style={page}><p style={{color:"#f87171"}}>{error}</p></div>
    </>
  );

  return (
    <>
      <Navbar />
      <div style={page}>
        <h1 style={{fontFamily:"Syne,sans-serif",fontSize:28,fontWeight:700,color:"#f1f5f9",marginBottom:24}}>
          Main Dump Dashboard
        </h1>

        {/* ================= FILTER BAR ================= */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <input
            style={input}
            placeholder="MSISDN"
            value={msisdn}
            onChange={e => setMsisdn(e.target.value)}
          />
          <input
            style={input}
            placeholder="Offer"
            value={offer}
            onChange={e => setOffer(e.target.value)}
          />
          <input
            style={input}
            placeholder="Publisher"
            value={publisher}
            onChange={e => setPublisher(e.target.value)}
          />
          <input
            style={input}
            placeholder="Advertiser"
            value={advertiser}
            onChange={e => setAdvertiser(e.target.value)}
          />
          <input
            style={{...input, colorScheme:"dark"}}
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
          />
          <input
            style={{...input, colorScheme:"dark"}}
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
          />
        </div>

        {/* ================= ACTIONS ================= */}
        <div style={{ marginBottom: 20, display:"flex", gap:10 }}>
          <button
            style={btnRed}
            onClick={() => {
              setMsisdn("");
              setOffer("");
              setPublisher("");
              setAdvertiser("");
              setFromDate("");
              setToDate("");
            }}
          >
            Clear Filters
          </button>
          <button style={btn} onClick={() => exportCSV(filteredRows)}>Export CSV</button>
          <button style={btn} onClick={applyFilters}>Apply Filters</button>
          <span style={{fontSize:13, color:"#64748b"}}>Total: {total} records</span>
          <div style={{display:"flex", gap:8, alignItems:"center"}}>
            <button style={{...btn, opacity: page===0?0.4:1}} disabled={page===0} onClick={()=>setPage(p=>p-1)}>← Prev</button>
            <span style={{fontSize:13}}>Page {page+1} of {Math.ceil(total/PAGE_SIZE)||1}</span>
            <button style={{...btn, opacity: (page+1)*PAGE_SIZE>=total?0.4:1}} disabled={(page+1)*PAGE_SIZE>=total} onClick={()=>setPage(p=>p+1)}>Next →</button>
          </div>
        </div>

        {/* ================= TABLE ================= */}
        <div style={{background:"#0d1326", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, overflow:"hidden"}}>
          <div style={{ overflowX: "auto" }}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>#</th>
                  <th style={th}>Session ID</th>
                  <th style={th}>Publisher</th>
                  <th style={th}>Advertiser</th>
                  <th style={th}>Offer</th>
                  <th style={th}>Geo</th>
                  <th style={th}>Carrier</th>
                  <th style={th}>MSISDN</th>
                  <th style={th}>Status</th>
                  <th style={th}>Payout ($)</th>
                  <th style={th}>Pub CPA ($)</th>
                  <th style={th}>Credited</th>
                  <th style={th}>Pub Req</th>
                  <th style={th}>Pub Res</th>
                  <th style={th}>Advertiser Req</th>
                  <th style={th}>Advertiser Res</th>
                  <th style={th}>Status</th>
                  <th style={th}>Date / Time (IST)</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, i) => (
                  <tr key={i}>
                    <td style={td} title={row.session_id} style={{...td, maxWidth:80, overflow:"hidden", textOverflow:"ellipsis", fontFamily:"monospace", fontSize:11}}>{String(i+1+page*PAGE_SIZE)}</td>
                    <td style={{...td, maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", fontFamily:"monospace", fontSize:10}} title={row.session_id}>{row.session_id?.slice(0,8)}...</td>
                    <td style={td}>{row.publisher_name}</td>
                    <td style={td}>{row.advertiser_name}</td>
                    <td style={td}>{row.offer_name}</td>
                    <td style={td}>{row.geo}</td>
                    <td style={td}>{row.carrier}</td>
                    <td style={td}>{row.msisdn}</td>
                    <td style={td}>{statusBadge(row.status)}</td>
                    <td style={td}>{row.payout ? `$${Number(row.payout).toFixed(2)}` : "-"}</td>
                    <td style={td}>{row.publisher_cpa ? `$${Number(row.publisher_cpa).toFixed(2)}` : "-"}</td>
                    <td style={td}>{row.publisher_credited ? <span style={{color:"#16a34a",fontWeight:700}}>✓</span> : <span style={{color:"#dc2626"}}>✗</span>}</td>
                    <td style={td}>{renderJSON(row.publisher_request)}</td>
                    <td style={td}>{renderJSON(row.publisher_response)}</td>
                    <td style={td}>{renderJSON(row.advertiser_request)}</td>
                    <td style={td}>{renderJSON(row.advertiser_response)}</td>
                    <td style={td}>{row.status}</td>
                    <td style={td}>{row.created_ist}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p style={{ marginTop: 16, color:"#64748b", fontSize:13 }}>
          Showing <b style={{color:"#94a3b8"}}>{filteredRows.length}</b> of {rows.length}
        </p>
      </div>
    </>
  );
}
