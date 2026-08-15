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
  const [totals, setTotals] = useState({ clicks: 0, conversions_in: 0, conversions_out: 0, revenue: 0, publisher_cost: 0, margin: 0 });
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
      if (data.status === "SUCCESS") {
        setRows(data.data);
        setTotals({ clicks: 0, conversions_in: 0, conversions_out: 0, revenue: 0, publisher_cost: 0, margin: 0, ...data.totals });
      } else showToast(data.message || "Failed to load report");
    } catch {
      showToast("Network error while loading report");
    } finally {
      setLoading(false);
    }
  };

  const isAdvPub = groupBy === "advertiser_publisher";
  const groupLabel = { campaign: "Campaign", affiliate: "Publisher", vertical: "Vertical", geo: "Geo", date: "Date" }[groupBy];
  const totalCrIn = totals.clicks ? ((totals.conversions_in / totals.clicks) * 100).toFixed(2) : "0.00";
  const totalCrOut = totals.clicks ? ((totals.conversions_out / totals.clicks) * 100).toFixed(2) : "0.00";

  return (
    <CpaLayout>
      {toast && <div style={{ position: "fixed", top: 80, right: 24, zIndex: 9999, background: "rgba(239,68,68,0.08)", border: "1px solid #fca5a5", color: "#dc2626", padding: "12px 20px", borderRadius: 12, fontSize: 13 }}>{toast}</div>}
      <h1 style={pageTitle}>Reports</h1>
      <p style={{ color: "#9b7faa", fontSize: 13, marginTop: -12, marginBottom: 18 }}>
        CR In = conversions the advertiser confirmed · CR Out = conversions actually forwarded to the publisher (after any hold %)
      </p>

      <div style={{ ...statRow, marginBottom: 18 }}>
        <div style={statCard}><div style={statLabel}>Clicks</div><div style={statValue}>{totals.clicks}</div></div>
        <div style={statCard}><div style={statLabel}>CR In</div><div style={statValue}>{totalCrIn}%</div></div>
        <div style={statCard}><div style={statLabel}>CR Out</div><div style={statValue}>{totalCrOut}%</div></div>
        <div style={statCard}><div style={statLabel}>Revenue</div><div style={statValue}>{totals.revenue.toFixed(2)}</div></div>
        {isAdvPub && <div style={statCard}><div style={statLabel}>Margin</div><div style={statValue}>{totals.margin.toFixed(2)}</div></div>}
      </div>

      <div style={filterBar}>
        <select style={filterSelect} value={groupBy} onChange={e => setGroupBy(e.target.value)}>
          <option value="campaign">Group by Campaign</option>
          <option value="affiliate">Group by Publisher</option>
          <option value="advertiser_publisher">Advertiser × Publisher</option>
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
                {isAdvPub ? (
                  <>
                    <th style={th}>Advertiser</th>
                    <th style={th}>Publisher</th>
                  </>
                ) : (
                  <th style={th}>{groupLabel}</th>
                )}
                <th style={th}>Clicks</th>
                <th style={th}>Conv. In</th>
                <th style={th}>CR In</th>
                <th style={th}>Conv. Out</th>
                <th style={th}>CR Out</th>
                <th style={th}>Revenue</th>
                {isAdvPub && <th style={th}>Publisher Cost</th>}
                {isAdvPub && <th style={th}>Margin</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {isAdvPub ? (
                    <>
                      <td style={td}>{r.advertiser_name}</td>
                      <td style={td}>{r.publisher_name}</td>
                    </>
                  ) : (
                    <td style={td}>{groupBy === "date" ? new Date(r.label).toLocaleDateString() : r.label}</td>
                  )}
                  <td style={td}>{r.clicks}</td>
                  <td style={td}>{r.conversions_in}</td>
                  <td style={td}>{r.cr_in}%</td>
                  <td style={td}>{r.conversions_out}</td>
                  <td style={td}>{r.cr_out}%</td>
                  <td style={td}>{r.revenue.toFixed(2)}</td>
                  {isAdvPub && <td style={td}>{r.publisher_cost.toFixed(2)}</td>}
                  {isAdvPub && <td style={{ ...td, color: r.margin >= 0 ? "#16a34a" : "#dc2626", fontWeight: 700 }}>{r.margin.toFixed(2)}</td>}
                </tr>
              ))}
              {!rows.length && (
                <tr><td style={td} colSpan={isAdvPub ? 9 : 7}>{loading ? "Loading..." : "No data for this range."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </CpaLayout>
  );
}
