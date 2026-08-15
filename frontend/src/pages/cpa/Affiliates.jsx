import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CpaLayout from "../../components/cpa/CpaLayout";
import { btn, input, table, th, td, badge, pageTitle } from "../../styles/shared.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

export default function Affiliates() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [affiliates, setAffiliates] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [toast, setToast] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [links, setLinks] = useState([]);
  const [postbacks, setPostbacks] = useState([]);
  const [newPostback, setNewPostback] = useState("");

  useEffect(() => { if (!token) navigate("/login"); else load(); }, []);
  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2800); };

  const load = async () => {
    const res = await fetch(`${API_BASE}/api/affiliates`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.status === "SUCCESS") setAffiliates(data.data);
  };

  const add = async () => {
    if (!name.trim()) return showToast("Affiliate name required", "error");
    const res = await fetch(`${API_BASE}/api/affiliates`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, email }),
    });
    const data = await res.json();
    if (data.status === "SUCCESS") { setAffiliates(a => [data.data, ...a]); setName(""); setEmail(""); showToast("Affiliate added"); }
  };

  const toggleStatus = async (a) => {
    const ns = a.status === "active" ? "paused" : "active";
    setAffiliates(l => l.map(x => x.id === a.id ? { ...x, status: ns } : x));
    await fetch(`${API_BASE}/api/affiliates/${a.id}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: ns }),
    });
  };

  const copy = async (text) => { await navigator.clipboard.writeText(text); showToast("Copied!"); };

  const openAffiliate = async (a) => {
    if (expanded === a.id) { setExpanded(null); return; }
    setExpanded(a.id);
    const [linksRes, pbRes] = await Promise.all([
      fetch(`${API_BASE}/api/affiliates/${a.id}/campaigns`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE}/api/affiliates/${a.id}/postback-urls`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const linksData = await linksRes.json();
    const pbData = await pbRes.json();
    if (linksData.status === "SUCCESS") setLinks(linksData.data);
    if (pbData.status === "SUCCESS") setPostbacks(pbData.data);
  };

  const addPostback = async (affId) => {
    if (!newPostback.trim()) return;
    const res = await fetch(`${API_BASE}/api/affiliates/${affId}/postback-urls`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ postback_url: newPostback }),
    });
    const data = await res.json();
    if (data.status === "SUCCESS") { setPostbacks(p => [data.data, ...p]); setNewPostback(""); showToast("Postback URL saved"); }
  };

  const deletePostback = async (pbId) => {
    await fetch(`${API_BASE}/api/affiliates/postback-urls/${pbId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setPostbacks(p => p.filter(x => x.id !== pbId));
  };

  return (
    <CpaLayout>
      {toast && <div style={{ position: "fixed", top: 80, right: 24, zIndex: 9999, background: toast.type === "error" ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)", border: `1px solid ${toast.type === "error" ? "#fca5a5" : "#86efac"}`, color: toast.type === "error" ? "#dc2626" : "#16a34a", padding: "12px 20px", borderRadius: 12, fontSize: 13 }}>{toast.msg}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={pageTitle}>Affiliates</h1>
          <p style={{ color: "#9b7faa", fontSize: 13 }}>{affiliates.length} affiliates</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input style={{ ...input, width: 200 }} placeholder="Affiliate name" value={name} onChange={e => setName(e.target.value)} />
          <input style={{ ...input, width: 200 }} placeholder="Email (optional)" value={email} onChange={e => setEmail(e.target.value)} />
          <button style={btn} onClick={add}>+ Add Affiliate</button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {affiliates.map(a => (
          <div key={a.id} style={{ background: "#fff", border: "1px solid #e8d0dc", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", cursor: "pointer" }} onClick={() => openAffiliate(a)}>
              <div>
                <strong style={{ color: "#4a2f3f" }}>{a.name}</strong>
                <span style={{ color: "#b89ab0", fontSize: 12, marginLeft: 10 }}>{a.email || "—"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "#9b7faa" }}>
                <span>Clicks: <b>{a.total_clicks}</b></span>
                <span>Conversions: <b>{a.total_conversions}</b></span>
                <span>Revenue: <b>{a.total_revenue}</b></span>
                <span style={badge(a.status === "active" ? "green" : "red")} onClick={(e) => { e.stopPropagation(); toggleStatus(a); }}>
                  {a.status === "active" ? "● Active" : "● Paused"}
                </span>
                <span>{expanded === a.id ? "▲" : "▼"}</span>
              </div>
            </div>

            {expanded === a.id && (
              <div style={{ borderTop: "1px solid #f0e0e8", padding: "16px 18px", background: "#fdf6f9" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: "#9b7faa" }}>Affiliate Key:</span>
                  <code style={{ fontSize: 12, background: "#fff", padding: "3px 8px", borderRadius: 6 }}>{a.affiliate_key}</code>
                  <button style={{ ...btn, padding: "3px 10px", fontSize: 11 }} onClick={() => copy(a.affiliate_key)}>Copy</button>
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, color: "#9b7faa", textTransform: "uppercase", marginBottom: 6 }}>Personalized Tracking Links</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                  {links.map(l => (
                    <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", padding: "8px 12px", borderRadius: 10, border: "1px solid #eedde8" }}>
                      <span style={{ fontSize: 12, color: "#4a2f3f" }}>{l.name} <span style={{ color: "#b89ab0" }}>({l.vertical_name})</span></span>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <code style={{ fontSize: 11, color: "#9b7faa" }}>{l.tracking_url}</code>
                        <button style={{ ...btn, padding: "3px 10px", fontSize: 11 }} onClick={() => copy(l.tracking_url)}>Copy</button>
                      </div>
                    </div>
                  ))}
                  {!links.length && <div style={{ fontSize: 12, color: "#b89ab0" }}>No active campaigns yet.</div>}
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, color: "#9b7faa", textTransform: "uppercase", marginBottom: 6 }}>Postback URLs (we forward conversions here, S2S)</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input style={{ ...input, flex: 1 }} placeholder="https://affiliate-tracker.com/pb?click_id={click_id}&payout={payout}&status={status}" value={newPostback} onChange={e => setNewPostback(e.target.value)} />
                  <button style={{ ...btn, padding: "8px 16px" }} onClick={() => addPostback(a.id)}>Add</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {postbacks.map(p => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", padding: "6px 12px", borderRadius: 10, border: "1px solid #eedde8" }}>
                      <code style={{ fontSize: 11, color: "#4a2f3f" }}>{p.postback_url}</code>
                      <button style={{ ...btn, padding: "3px 10px", fontSize: 11, background: "rgba(220,100,100,0.1)", color: "#dc6464" }} onClick={() => deletePostback(p.id)}>Remove</button>
                    </div>
                  ))}
                  {!postbacks.length && <div style={{ fontSize: 12, color: "#b89ab0" }}>No postback URL set.</div>}
                </div>
              </div>
            )}
          </div>
        ))}
        {!affiliates.length && <div style={{ color: "#b89ab0", fontSize: 13 }}>No affiliates yet — add one above.</div>}
      </div>
    </CpaLayout>
  );
}
