import { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { btn, btnRed, input, table, th, td, page as pageStyle } from "../styles/shared.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";
const PAGE_SIZE = 100;

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

function StatusBadge({ status }) {
  const colors = {
    VERIFIED:   { bg: "#dcfce7", color: "#16a34a" },
    OTP_SENT:   { bg: "#dbeafe", color: "#1d4ed8" },
    OTP_FAILED: { bg: "#fee2e2", color: "#dc2626" },
    OTP_INVALID:{ bg: "#fef9c3", color: "#854d0e" },
    CAP_REACHED:{ bg: "#f3e8ff", color: "#7c3aed" },
    SCRUBBED:   { bg: "#f1f5f9", color: "#64748b" },
  };
  const c = colors[status] || { bg: "#f1f5f9", color: "#64748b" };
  return (
    <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: c.bg, color: c.color }}>
      {status || "-"}
    </span>
  );
}

function JsonCell({ data }) {
  if (!data) return <span style={{ color: "#64748b" }}>-</span>;
  const str = typeof data === "object" ? JSON.stringify(data, null, 2) : String(data);
  return (
    <pre style={{ maxHeight: 130, overflow: "auto", background: "#0a0f1e", color: "#94a3b8", padding: 8, borderRadius: 8, fontSize: 11, margin: 0 }}>
      {str}
    </pre>
  );
}

function exportCSV(rows) {
  if (!rows.length) return alert("No data to export");
  const headers = ["session_id","publisher_name","advertiser_name","offer_name","geo","carrier","msisdn","status","payout","publisher_cpa","publisher_credited","created_ist"];
  const csv = [
    headers.join(","),
    ...rows.map(row => headers.map(h => `"${formatCellValue(row[h]).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `dump_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function DumpDashboard() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [msisdn, setMsisdn]     = useState("");
  const [offer, setOffer]       = useState("");
  const [publisher, setPublisher] = useState("");
  const [advertiser, setAdvertiser] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [total, setTotal]       = useState(0);

  const fetchData = useCallback(async (pageNum = 0) => {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("token");
    const params = new URLSearchParams();
    if (msisdn)   params.set("msisdn", msisdn);
    if (fromDate) params.set("from", fromDate);
    if (toDate)   params.set("to", toDate);
    params.set("limit", PAGE_SIZE);
    params.set("offset", pageNum * PAGE_SIZE);
    try {
      const res = await fetch(`${API_BASE}/api/dashboard/dump?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.message || "Failed");
      setRows(Array.isArray(d?.data) ? d.data : []);
      setTotal(Number(d.total) || 0);
    } catch (e) {
      setError(e.message || "Failed to load dump");
    }
    setLoading(false);
  }, [msisdn, fromDate, toDate]);

  useEffect(() => {
    fetchData(currentPage);
  }, [currentPage]);

  const applyFilters = () => {
    setCurrentPage(0);
    fetchData(0);
  };

  const clearFilters = () => {
    setMsisdn(""); setOffer(""); setPublisher("");
    setAdvertiser(""); setFromDate(""); setToDate("");
    setCurrentPage(0);
    fetchData(0);
  };

  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      if (offer && !row.offer_name?.toLowerCase().includes(offer.toLowerCase())) return false;
      if (publisher && !row.publisher_name?.toLowerCase().includes(publisher.toLowerCase())) return false;
      if (advertiser && !row.advertiser_name?.toLowerCase().includes(advertiser.toLowerCase())) return false;
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
  }, [rows, offer, publisher, advertiser, fromDate, toDate]);

  if (error) return (
    <>
      <Navbar />
      <div style={pageStyle}><p style={{ color: "#f87171" }}>{error}</p></div>
    </>
  );

  return (
    <>
      <Navbar />
      <div style={pageStyle}>
        <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: 28, fontWeight: 700, color: "#f1f5f9", marginBottom: 24 }}>
          Main Dump Dashboard
        </h1>

        {/* FILTER BAR */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 16 }}>
          <input style={input} placeholder="MSISDN" value={msisdn} onChange={e => setMsisdn(e.target.value)} />
          <input style={input} placeholder="Offer" value={offer} onChange={e => setOffer(e.target.value)} />
          <input style={input} placeholder="Publisher" value={publisher} onChange={e => setPublisher(e.target.value)} />
          <input style={input} placeholder="Advertiser" value={advertiser} onChange={e => setAdvertiser(e.target.value)} />
          <input style={{ ...input, colorScheme: "dark" }} type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          <input style={{ ...input, colorScheme: "dark" }} type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>

        {/* ACTIONS */}
        <div style={{ marginBottom: 20, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button style={btnRed} onClick={clearFilters}>Clear Filters</button>
          <button style={btn} onClick={applyFilters}>Apply Filters</button>
          <button style={btn} onClick={() => exportCSV(filteredRows)}>Export CSV</button>
          <span style={{ fontSize: 13, color: "#64748b" }}>Total: {total} records</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
            <button style={{ ...btn, opacity: currentPage === 0 ? 0.4 : 1 }} disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>← Prev</button>
            <span style={{ fontSize: 13, color: "#94a3b8" }}>Page {currentPage + 1} of {Math.max(Math.ceil(total / PAGE_SIZE), 1)}</span>
            <button style={{ ...btn, opacity: (currentPage + 1) * PAGE_SIZE >= total ? 0.4 : 1 }} disabled={(currentPage + 1) * PAGE_SIZE >= total} onClick={() => setCurrentPage(p => p + 1)}>Next →</button>
          </div>
        </div>

        {/* TABLE */}
        <div style={{ background: "#0d1326", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            {loading ? (
              <p style={{ color: "#94a3b8", padding: 32, textAlign: "center" }}>Loading dump logs…</p>
            ) : (
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
                    <th style={th}>Pub Request</th>
                    <th style={th}>Pub Response</th>
                    <th style={th}>Adv Request</th>
                    <th style={th}>Adv Response</th>
                    <th style={th}>Date / Time (IST)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr><td colSpan={17} style={{ ...td, textAlign: "center", color: "#64748b", padding: 32 }}>No records found</td></tr>
                  ) : filteredRows.map((row, i) => (
                    <tr key={row.session_id || i}>
                      <td style={{ ...td, fontFamily: "monospace", fontSize: 11 }}>{String(currentPage * PAGE_SIZE + i + 1)}</td>
                      <td style={{ ...td, fontFamily: "monospace", fontSize: 10, maxWidth: 100 }} title={row.session_id || ""}>{row.session_id ? row.session_id.slice(0, 8) + "..." : "-"}</td>
                      <td style={td}>{row.publisher_name || "-"}</td>
                      <td style={td}>{row.advertiser_name || "-"}</td>
                      <td style={td}>{row.offer_name || "-"}</td>
                      <td style={td}>{row.geo || "-"}</td>
                      <td style={td}>{row.carrier || "-"}</td>
                      <td style={td}>{row.msisdn || "-"}</td>
                      <td style={td}><StatusBadge status={row.status} /></td>
                      <td style={td}>{row.payout ? `$${Number(row.payout).toFixed(2)}` : "-"}</td>
                      <td style={td}>{row.publisher_cpa ? `$${Number(row.publisher_cpa).toFixed(2)}` : "-"}</td>
                      <td style={{ ...td, textAlign: "center" }}>{row.publisher_credited ? <span style={{ color: "#16a34a", fontWeight: 700 }}>✓</span> : <span style={{ color: "#dc2626" }}>✗</span>}</td>
                      <td style={td}><JsonCell data={row.publisher_request} /></td>
                      <td style={td}><JsonCell data={row.publisher_response} /></td>
                      <td style={td}><JsonCell data={row.advertiser_request} /></td>
                      <td style={td}><JsonCell data={row.advertiser_response} /></td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>{row.created_ist || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <p style={{ marginTop: 16, color: "#64748b", fontSize: 13 }}>
          Showing <b style={{ color: "#94a3b8" }}>{filteredRows.length}</b> of {rows.length} loaded records
        </p>
      </div>
    </>
  );
}
