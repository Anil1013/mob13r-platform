import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CpaLayout from "../../components/cpa/CpaLayout";
import { btn, input, table, th, td, badge, pageTitle } from "../../styles/shared.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

export default function CpaAdvertisers() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [advertisers, setAdvertisers] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!token) navigate("/login"); else load(); }, []);
  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2800); };

  const load = async () => {
    const res = await fetch(`${API_BASE}/api/advertisers`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (Array.isArray(data)) setAdvertisers(data);
  };

  const add = async () => {
    if (!name.trim()) return showToast("Advertiser name required", "error");
    setSaving(true);
    const res = await fetch(`${API_BASE}/api/advertisers`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, email }),
    });
    const data = await res.json();
    setSaving(false);
    if (data && data.id) { setAdvertisers(a => [data, ...a]); setName(""); setEmail(""); showToast("Advertiser added"); }
    else showToast(data.message || "Failed to add advertiser", "error");
  };

  const toggle = async (a) => {
    const ns = a.status === "active" ? "inactive" : "active";
    setAdvertisers(l => l.map(x => x.id === a.id ? { ...x, status: ns } : x));
    const res = await fetch(`${API_BASE}/api/advertisers/${a.id}/toggle`, {
      method: "PATCH", headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) load();
  };

  return (
    <CpaLayout>
      {toast && <div style={{ position: "fixed", top: 80, right: 24, zIndex: 9999, background: toast.type === "error" ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)", border: `1px solid ${toast.type === "error" ? "#fca5a5" : "#86efac"}`, color: toast.type === "error" ? "#dc2626" : "#16a34a", padding: "12px 20px", borderRadius: 12, fontSize: 13 }}>{toast.msg}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={pageTitle}>Advertisers</h1>
          <p style={{ color: "#9b7faa", fontSize: 13 }}>{advertisers.length} advertisers · shared across all verticals (CPA/CPI/CPS/DCB)</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input style={{ ...input, width: 220 }} placeholder="Advertiser name" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
          <input style={{ ...input, width: 220 }} placeholder="Email (optional)" value={email} onChange={e => setEmail(e.target.value)} />
          <button style={{ ...btn, opacity: saving ? 0.7 : 1 }} onClick={add} disabled={saving}>{saving ? "Adding..." : "+ Add Advertiser"}</button>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e8d0dc", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>#</th>
                <th style={th}>Name</th>
                <th style={th}>Email</th>
                <th style={th}>Created</th>
                <th style={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {advertisers.map(a => (
                <tr key={a.id}>
                  <td style={td}>{a.seq_id}</td>
                  <td style={td}>{a.name}</td>
                  <td style={td}>{a.email || "—"}</td>
                  <td style={td}>{new Date(a.created_at).toLocaleDateString()}</td>
                  <td style={td}>
                    <span style={badge(a.status === "active" ? "green" : "red")} onClick={() => toggle(a)} title="Click to toggle">
                      {a.status === "active" ? "● Active" : "● Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
              {!advertisers.length && (
                <tr><td style={td} colSpan={5}>No advertisers yet — add one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </CpaLayout>
  );
}
