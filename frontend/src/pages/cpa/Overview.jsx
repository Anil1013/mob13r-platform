import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import CpaLayout from "../../components/cpa/CpaLayout";
import { DatePickerField } from "../../components/DateRangePicker.jsx";
import TableStateRow from "../../components/TableState.jsx";
import { table, th, td, pageTitle, statRow, statCard, statLabel, statValue } from "../../styles/shared.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

const GREEN = "#16a34a";
const RED = "#dc2626";
const money = (n) => Number(n || 0).toFixed(2);

const compactSelect = { background: "#fff", border: "1px solid rgba(210,160,180,0.35)", color: "#4a2f3f", padding: "6px 8px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "'Inter',sans-serif", minWidth: 0 };
const compactInput = { ...compactSelect, cursor: "text" };
const compactBtn = { background: "linear-gradient(135deg,#e8856a,#d4709a)", color: "#fff", border: "none", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap" };
const toggleBtn = (active) => ({
  padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "1px solid rgba(210,160,180,0.35)",
  background: active ? "linear-gradient(135deg,#e8856a,#d4709a)" : "#fff", color: active ? "#fff" : "#4a2f3f", fontFamily: "'Inter',sans-serif",
});

function emptySums() { return { revenue: 0, publisher_cost: 0, margin: 0 }; }
function addSums(a, r) {
  return { revenue: a.revenue + r.revenue, publisher_cost: a.publisher_cost + r.publisher_cost, margin: a.margin + r.margin };
}

export default function CpaOverview() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [mode, setMode] = useState("vertical"); // "vertical" | "date"
  const [verticals, setVerticals] = useState([]);
  const [verticalId, setVerticalId] = useState("");
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(today());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { if (!token) navigate("/login"); else { load(); loadVerticals(); } }, []);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  const loadVerticals = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/verticals`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === "SUCCESS") setVerticals(data.data);
    } catch { /* non-blocking */ }
  };

  const load = async (overrides = {}) => {
    const gMode = overrides.mode ?? mode;
    const gVerticalId = overrides.verticalId ?? verticalId;
    const gFrom = overrides.from ?? from;
    const gTo = overrides.to ?? to;

    if (gFrom && gTo && gFrom > gTo) return showToast("From date must be before To date");
    setLoading(true);
    try {
      const params = new URLSearchParams({ group_by: gMode === "date" ? "date" : "vertical", from: gFrom, to: gTo });
      if (gVerticalId) params.set("vertical_id", gVerticalId);
      const res = await fetch(`${API_BASE}/api/cpa-reports?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === "SUCCESS") setRows(data.data);
      else showToast(data.message || "Failed to load overview");
    } catch {
      showToast("Network error while loading overview");
    } finally {
      setLoading(false);
    }
  };

  // Rows come back at full grain — aggregate client-side into one row per
  // vertical, or one row per date, keeping only Revenue / Cost / Profit.
  const aggregated = useMemo(() => {
    const key = mode === "date" ? "date" : "vertical_name";
    const groups = new Map();
    for (const r of rows) {
      const k = r[key] ?? "—";
      if (!groups.has(k)) groups.set(k, emptySums());
      groups.set(k, addSums(groups.get(k), r));
    }
    let entries = [...groups.entries()].map(([k, sums]) => ({ key: k, ...sums }));
    entries.sort((a, b) => mode === "date" ? (a.key < b.key ? 1 : -1) : b.revenue - a.revenue);
    return entries;
  }, [rows, mode]);

  const grandTotal = useMemo(() => rows.reduce(addSums, emptySums()), [rows]);

  return (
    <CpaLayout>
      {toast && <div style={{ position: "fixed", top: 80, right: 24, zIndex: 9999, background: "rgba(239,68,68,0.08)", border: "1px solid #fca5a5", color: "#dc2626", padding: "12px 20px", borderRadius: 12, fontSize: 13 }}>{toast}</div>}
      <h1 style={pageTitle}>Overview — All Verticals Revenue</h1>
      <p style={{ color: "#9b7faa", fontSize: 13, marginTop: -12, marginBottom: 18 }}>
        Revenue, cost and profit by vertical or by date
      </p>

      <div style={{ ...statRow, marginBottom: 18 }}>
        <div style={statCard}><div style={statLabel}>Revenue</div><div style={{ ...statValue, color: GREEN }}>{money(grandTotal.revenue)}</div></div>
        <div style={statCard}><div style={statLabel}>Cost</div><div style={{ ...statValue, color: RED }}>{money(grandTotal.publisher_cost)}</div></div>
        <div style={statCard}><div style={statLabel}>Profit</div><div style={{ ...statValue, color: grandTotal.margin >= 0 ? GREEN : RED }}>{money(grandTotal.margin)}</div></div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "nowrap", overflowX: "auto", alignItems: "center", marginBottom: 18, paddingBottom: 4 }}>
        <button style={toggleBtn(mode === "vertical")} onClick={() => { setMode("vertical"); load({ mode: "vertical" }); }}>Group by Vertical</button>
        <button style={toggleBtn(mode === "date")} onClick={() => { setMode("date"); load({ mode: "date" }); }}>Group by Date</button>
        <span style={{ width: 1, height: 24, background: "#e8d0dc", margin: "0 4px" }} />
        <select style={{ ...compactSelect, maxWidth: 160 }} value={verticalId} onChange={e => { const v = e.target.value; setVerticalId(v); load({ verticalId: v }); }}>
          <option value="">All Verticals</option>
          {verticals.map(v => <option key={v.id} value={v.id}>{v.icon} {v.name}</option>)}
        </select>
        <DatePickerField value={from} onChange={setFrom} style={{ ...compactInput, width: 110 }} />
        <DatePickerField value={to} onChange={setTo} style={{ ...compactInput, width: 110 }} />
        <button style={compactBtn} onClick={() => load()} disabled={loading}>{loading ? "..." : "Apply"}</button>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e8d0dc", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto", maxHeight: "65vh", overflowY: "auto" }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>{mode === "date" ? "Date" : "Vertical"}</th>
                <th style={th}>Revenue</th>
                <th style={th}>Cost</th>
                <th style={th}>Profit</th>
              </tr>
            </thead>
            <tbody>
              {aggregated.map((r, i) => (
                <tr key={i}>
                  <td style={td}>{mode === "date" ? new Date(r.key).toLocaleDateString() : r.key}</td>
                  <td style={{ ...td, color: GREEN, fontWeight: 600 }}>{money(r.revenue)}</td>
                  <td style={{ ...td, color: RED, fontWeight: 600 }}>{money(r.publisher_cost)}</td>
                  <td style={{ ...td, color: r.margin >= 0 ? GREEN : RED, fontWeight: 700 }}>{money(r.margin)}</td>
                </tr>
              ))}
              {!aggregated.length && (
                <TableStateRow colSpan={4} loading={loading} loadingText="Loading overview..." emptyText="No data for this range." emptyIcon="📈" />
              )}
            </tbody>
            {aggregated.length > 0 && (
              <tfoot>
                <tr style={{ background: "#fdf6f9", fontWeight: 800 }}>
                  <td style={td}>GRAND TOTAL</td>
                  <td style={{ ...td, color: GREEN }}>{money(grandTotal.revenue)}</td>
                  <td style={{ ...td, color: RED }}>{money(grandTotal.publisher_cost)}</td>
                  <td style={{ ...td, color: grandTotal.margin >= 0 ? GREEN : RED }}>{money(grandTotal.margin)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </CpaLayout>
  );
}
