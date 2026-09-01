import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

function pill(text, tone = "neutral") {
  const tones = {
    neutral: { bg: "#f8fafc", color: "#334155", border: "#e2e8f0" },
    green: { bg: "#ecfdf5", color: "#16a34a", border: "#bbf7d0" },
    red: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  };
  const t = tones[tone];
  return (
    <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 20, background: t.bg, color: t.color, fontWeight: 700, fontSize: 11.5, fontFamily: "'Lora',serif", border: `1px solid ${t.border}` }}>
      {text}
    </span>
  );
}

function StatusBadge({ status }) {
  const ok = status === "sent";
  return pill(ok ? "✓ Sent" : "✗ Failed", ok ? "green" : "red");
}

export default function EmailLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/email/logs?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      setLogs(d.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = logs.filter(l =>
    !search || l.publisher_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.to_email?.toLowerCase().includes(search.toLowerCase()) ||
    l.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  const sentCount = filtered.filter(l => l.status === "sent").length;
  const failedCount = filtered.length - sentCount;

  const s = {
    page: { padding: "32px 28px", fontFamily: "'Lora',serif", background: "linear-gradient(180deg,#fdf8fb 0%,#fbf3f7 100%)", minHeight: "100vh", maxWidth: 1440, margin: "0 auto" },
    title: { fontSize: 26, fontWeight: 800, color: "#2d1b30", marginBottom: 4, letterSpacing: "-0.01em" },
    sub: { color: "#a888b3", fontSize: 13, marginBottom: 22 },
    statRow: { display: "flex", gap: 14, marginBottom: 22, flexWrap: "wrap" },
    statCard: { background: "#fff", border: "1px solid #f0e5ec", borderRadius: 16, padding: "14px 22px", minWidth: 130, boxShadow: "0 4px 16px rgba(124,58,237,0.08), 0 1px 3px rgba(0,0,0,0.03)" },
    statLabel: { color: "#a888b3", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 },
    statValue: { fontSize: 22, fontWeight: 800, color: "#2d1b30" },
    card: { background: "#fff", border: "1px solid #f0e5ec", borderRadius: 18, overflow: "hidden", boxShadow: "0 8px 30px rgba(124,58,237,0.09), 0 2px 6px rgba(0,0,0,0.03)" },
    th: { padding: "14px 16px", textAlign: "left", fontSize: 11, color: "#8b6a9a", fontWeight: 700,
      textTransform: "uppercase", letterSpacing: "0.06em", background: "#faf6fb", borderBottom: "1.5px solid #eee0ea", position: "sticky", top: 0, whiteSpace: "nowrap" },
    td: { padding: "12px 16px", fontSize: 13, borderBottom: "1px solid #f4ecf1", color: "#3d2436" },
    input: { padding: "10px 16px", borderRadius: 12, border: "1.5px solid #ecdde6", fontSize: 13.5,
      outline: "none", width: 300, background: "#fff", fontFamily: "'Lora',serif", boxShadow: "0 1px 2px rgba(124,58,237,0.04)" },
    refreshBtn: { padding: "9px 18px", borderRadius: 11, border: "none", background: "linear-gradient(135deg,#7c3aed,#d4709a)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'Lora',serif", boxShadow: "0 4px 12px rgba(124,58,237,0.25)" },
  };

  return (
    <>
      <Navbar />
      <div style={s.page} className="m13-fade-in">
        <div style={s.title}>📧 Email Logs</div>
        <div style={s.sub}>API docs emails sent to publishers</div>

        <div style={s.statRow}>
          <div style={s.statCard}>
            <div style={s.statLabel}>Total</div>
            <div style={s.statValue}>{filtered.length}</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statLabel}>Sent</div>
            <div style={{ ...s.statValue, color: "#16a34a" }}>{sentCount}</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statLabel}>Failed</div>
            <div style={{ ...s.statValue, color: "#dc2626" }}>{failedCount}</div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <input style={s.input} placeholder="🔍 Search publisher, email, offer..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <button className="m13-btn" onClick={load} style={s.refreshBtn}>
            🔄 Refresh
          </button>
        </div>

        <div style={s.card}>
          {loading ? (
            <div style={{ padding: 50, textAlign: "center" }}>
              <span className="m13-spinner" />
              <div style={{ marginTop: 10, color: "#a888b3", fontSize: 13 }}>Loading email logs...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 50, textAlign: "center" }}>
              <div style={{ fontSize: 28, opacity: 0.5, marginBottom: 6 }}>📭</div>
              <div style={{ color: "#a888b3", fontSize: 13 }}>No email logs found</div>
            </div>
          ) : (
            <div style={{ overflowX: "auto", maxHeight: "70vh", overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={s.th}>#</th>
                    <th style={s.th}>Publisher</th>
                    <th style={s.th}>Offer</th>
                    <th style={s.th}>Sent To</th>
                    <th style={s.th}>Subject</th>
                    <th style={s.th}>Status</th>
                    <th style={s.th}>Error</th>
                    <th style={s.th}>Sent At</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l, i) => (
                    <tr key={l.id} className="m13-row-hover" style={{ background: i % 2 === 0 ? "#fff" : "#fdfafc" }}>
                      <td style={s.td}>{i + 1}</td>
                      <td style={s.td}>{pill(l.publisher_name || "-")}</td>
                      <td style={{ ...s.td, whiteSpace: "nowrap" }}>{l.display_name || l.offer_name || "-"}</td>
                      <td style={{ ...s.td, color: "#7c3aed", whiteSpace: "nowrap" }}>{l.to_email}</td>
                      <td style={{ ...s.td, fontSize: 12, color: "#8b6a9a", maxWidth: 220 }}>{l.subject}</td>
                      <td style={s.td}><StatusBadge status={l.status} /></td>
                      <td style={{ ...s.td, fontSize: 11, color: "#dc2626", maxWidth: 160 }}>{l.error || "-"}</td>
                      <td style={{ ...s.td, whiteSpace: "nowrap", fontSize: 12, color: "#8b6a9a" }}>
                        {l.sent_at ? new Date(l.sent_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: true }) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
