import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

function StatusBadge({ status }) {
  const ok = status === "sent";
  return (
    <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: ok ? "#dcfce7" : "#fee2e2", color: ok ? "#16a34a" : "#dc2626" }}>
      {ok ? "✓ Sent" : "✗ Failed"}
    </span>
  );
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

  const s = {
    page: { padding: "24px", fontFamily: "sans-serif", background: "#f5f6fa", minHeight: "100vh" },
    title: { fontSize: "22px", fontWeight: 700, color: "#1a1a2e", marginBottom: 4 },
    sub: { color: "#94a3b8", fontSize: 13, marginBottom: 24 },
    card: { background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" },
    th: { padding: "10px 14px", textAlign: "left", fontSize: 11, color: "#94a3b8", fontWeight: 700,
      textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "2px solid #f0f0f0" },
    td: { padding: "11px 14px", fontSize: 13, borderBottom: "1px solid #f7f7f7", color: "#1e293b" },
    input: { padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14,
      outline: "none", width: 280 },
  };

  return (
    <>
      <Navbar />
      <div style={s.page}>
        <div style={s.title}>📧 Email Logs</div>
        <div style={s.sub}>API docs emails sent to publishers</div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <input style={s.input} placeholder="Search publisher, email, offer..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>{filtered.length} records</span>
            <button onClick={load}
              style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0",
                background: "#fff", cursor: "pointer", fontSize: 13 }}>
              🔄 Refresh
            </button>
          </div>
        </div>

        <div style={s.card}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>No email logs found</div>
          ) : (
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
                  <tr key={l.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={s.td}>{i + 1}</td>
                    <td style={s.td}><strong>{l.publisher_name || "-"}</strong></td>
                    <td style={s.td}>{l.display_name || l.offer_name || "-"}</td>
                    <td style={{ ...s.td, color: "#2563eb" }}>{l.to_email}</td>
                    <td style={{ ...s.td, fontSize: 12, color: "#64748b", maxWidth: 200 }}>{l.subject}</td>
                    <td style={s.td}><StatusBadge status={l.status} /></td>
                    <td style={{ ...s.td, fontSize: 11, color: "#dc2626", maxWidth: 150 }}>{l.error || "-"}</td>
                    <td style={{ ...s.td, whiteSpace: "nowrap", fontSize: 12, color: "#64748b" }}>
                      {l.sent_at ? new Date(l.sent_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: true }) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
