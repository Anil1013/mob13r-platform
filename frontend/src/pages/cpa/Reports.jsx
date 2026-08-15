import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CpaLayout from "../../components/cpa/CpaLayout";
import { table, th, td, pageTitle, filterBar, filterInput, filterSelect, applyBtn, statRow, statCard, statLabel, statValue } from "../../styles/shared.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

export default function CpaReports() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [groupBy, setGroupBy] = useState("campaign");
  const [from, setFrom] = useState(daysAgo(7));
  const [to, setTo] = useState(today());
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ clicks: 0, conversions: 0, revenue: 0 });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { if (!token) navigate("/login"); else load(); }, []);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  const load = async () => {
    if (from && to && from > to) return showToast("From date must be before To date");
    setLoading(true);
    try {
      const params = new URLSearchParams({ group_by: groupBy, from, to });
      const res = await fetch(`${API_BASE}/api/cpa-reports?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === "SUCCESS") { setRows(data.data); setTotals(data.totals); }
      else showToast(data.message || "Failed to load report");
    } catch {
      showToast("Network error while loading report");
    } finally {
      setLoading(false);
    }
  };

  const groupLabel = { campaign: "Campaign", affiliate: "Publisher", geo: "Geo", date: "Date", vertical: "Vertical" }[groupBy];

  return (
    <CpaLayout>
      {toast && <div style={{ position: "fixed", top: 80, right: 24, zIndex: 9999, background: "rgba(239,68,68,0.08)", border: "1px solid #fca5a5", color: "#dc2626", padding: "12px 20px", borderRadius: 12, fontSize: 13 }}>{toast}</div>}
      <h1 style={pageTitle}>Reports</h1>
      <p style={{ color: "#9b7faa", fontSize: 13, marginTop: -12, marginBottom: 18 }}>Affise-style breakdown — clicks, conversions, CR%, revenue</p>

      <div style={{ ...statRow, marginBottom: 18 }}>
        <div style={statCard}><div style={statLabel}>Clicks</div><div style={statValue}>{totals.clicks}</div></div>
        <div style={statCard}><div style={statLabel}>Conversions</div><div style={statValue}>{totals.conversions}</div></div>
        <div style={statCard}><div style={statLabel}>CR %</div><div style={statValue}>{totals.clicks ? ((totals.conversions / totals.clicks) * 100).toFixed(2) : "0.00"}%</div></div>
        <div style={statCard}><div style={statLabel}>Revenue</div><div style={statValue}>{totals.revenue.toFixed(2)}</div></div>
      </div>

      <div style={filterBar}>
        <select style={filterSelect} value={groupBy} onChange={e => setGroupBy(e.target.value)}>
          <option value="campaign">Group by Campaign</option>
          <option value="affiliate">Group by Publisher</option>
          <option value="vertical">Group by Vertical</option>
          <option value="geo">Group by Geo</option>
          <option value="date">Group by Date</option>
        </select>
        <input style={filterInput} type="date" value={from} onChange={e => setFrom(e.target.value)} />
        <input style={filterInput} type="date" value={to} onChange={e => setTo(e.target.value)} />
        <button style={applyBtn} onClick={load} disabled={loading}>{loading ? "Loading..." : "Apply"}</button>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e8d0dc", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto", maxHeight: "65vh", overflowY: "auto" }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>{groupLabel}</th>
                <th style={th}>Clicks</th>
                <th style={th}>Conversions</th>
                <th style={th}>CR %</th>
                <th style={th}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={td}>{groupBy === "date" ? new Date(r.label).toLocaleDateString() : r.label}</td>
                  <td style={td}>{r.clicks}</td>
                  <td style={td}>{r.conversions}</td>
                  <td style={td}>{r.cr}%</td>
                  <td style={td}>{r.revenue.toFixed(2)}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td style={td} colSpan={5}>No data for this range.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </CpaLayout>
  );
}
