import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CpaLayout from "../../components/cpa/CpaLayout";
import { table, th, td, badge, pageTitle, statRow, statCard, statLabel, statValue } from "../../styles/shared.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

export default function Conversions() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [conversions, setConversions] = useState([]);
  const [summary, setSummary] = useState({ total_conversions: 0, total_payout: 0, today_conversions: 0 });
  const [toast, setToast] = useState(null);

  useEffect(() => { if (!token) navigate("/login"); else load(); }, []);
  const showToast = (msg, type = "error") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2800); };

  const load = async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/api/conversions`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/conversions/summary`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const cData = await cRes.json();
      const sData = await sRes.json();
      if (cData.status === "SUCCESS") setConversions(cData.data);
      else showToast(cData.message || "Failed to load conversions");
      if (sData.status === "SUCCESS") setSummary(sData.data);
    } catch {
      showToast("Network error while loading conversions");
    }
  };

  return (
    <CpaLayout>
      {toast && <div style={{ position: "fixed", top: 80, right: 24, zIndex: 9999, background: "rgba(239,68,68,0.08)", border: "1px solid #fca5a5", color: "#dc2626", padding: "12px 20px", borderRadius: 12, fontSize: 13 }}>{toast.msg}</div>}
      <h1 style={pageTitle}>Conversions</h1>

      <div style={{ ...statRow, marginBottom: 20 }}>
        <div style={statCard}><div style={statLabel}>Total Conversions</div><div style={statValue}>{summary.total_conversions}</div></div>
        <div style={statCard}><div style={statLabel}>Total Payout</div><div style={statValue}>{summary.total_payout}</div></div>
        <div style={statCard}><div style={statLabel}>Today</div><div style={statValue}>{summary.today_conversions}</div></div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e8d0dc", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto", maxHeight: "70vh", overflowY: "auto" }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Click ID</th>
                <th style={th}>Campaign</th>
                <th style={th}>Affiliate</th>
                <th style={th}>Payout</th>
                <th style={th}>Transaction ID</th>
                <th style={th}>Forwarded</th>
                <th style={th}>Status</th>
                <th style={th}>Time</th>
              </tr>
            </thead>
            <tbody>
              {conversions.map(c => (
                <tr key={c.id}>
                  <td style={td}><code style={{ fontSize: 11 }}>{c.click_id}</code></td>
                  <td style={td}>{c.campaign_name}</td>
                  <td style={td}>{c.affiliate_name || "—"}</td>
                  <td style={td}>{c.payout}</td>
                  <td style={td}>{c.transaction_id || "—"}</td>
                  <td style={td}>{c.postback_forwarded ? "✅" : "—"}</td>
                  <td style={td}><span style={badge(c.status === "approved" ? "green" : "red")}>{c.status}</span></td>
                  <td style={td}>{new Date(c.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {!conversions.length && (
                <tr><td style={td} colSpan={8}>No conversions received yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </CpaLayout>
  );
}
