import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CpaLayout from "../../components/cpa/CpaLayout";
import { btn, btnRed, input, badge, pageTitle } from "../../styles/shared.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }
function isValidUrl(v) { return /^https?:\/\/.+/i.test(v.trim()); }

export default function Affiliates() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [affiliates, setAffiliates] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [links, setLinks] = useState([]);
  const [postbacks, setPostbacks] = useState([]);
  const [newPostback, setNewPostback] = useState("");
  const [savingPb, setSavingPb] = useState(false);
  const [panelLoading, setPanelLoading] = useState(false);

  useEffect(() => { if (!token) navigate("/login"); else load(); }, []);
  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2800); };
  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/affiliates`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === "SUCCESS") setAffiliates(data.data);
      else showToast(data.message || "Failed to load publishers", "error");
    } catch {
      showToast("Network error while loading publishers", "error");
    }
  };

  const add = async () => {
    if (!name.trim()) return showToast("Publisher name required", "error");
    if (email.trim() && !isValidEmail(email)) return showToast("Enter a valid email address", "error");
    setAdding(true);
    try {
      const res = await fetch(`${API_BASE}/api/affiliates`, {
        method: "POST", headers: authHeaders,
        body: JSON.stringify({ name: name.trim(), email: email.trim() || null }),
      });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        setAffiliates(a => [{ ...data.data, total_clicks: 0, total_conversions: 0, total_revenue: 0 }, ...a]);
        setName(""); setEmail("");
        showToast("Publisher added");
      } else {
        showToast(data.message || "Failed to add publisher", "error");
      }
    } catch {
      showToast("Network error while adding publisher", "error");
    } finally {
      setAdding(false);
    }
  };

  const toggleStatus = async (a) => {
    const ns = a.status === "active" ? "paused" : "active";
    const prev = affiliates;
    setAffiliates(l => l.map(x => x.id === a.id ? { ...x, status: ns } : x));
    try {
      const res = await fetch(`${API_BASE}/api/affiliates/${a.id}/status`, {
        method: "PATCH", headers: authHeaders,
        body: JSON.stringify({ status: ns }),
      });
      if (!res.ok) { setAffiliates(prev); showToast("Failed to update status", "error"); }
    } catch {
      setAffiliates(prev);
      showToast("Network error while updating status", "error");
    }
  };

  const copy = async (text, label = "Value") => {
    try { await navigator.clipboard.writeText(text); showToast(`${label} copied!`); }
    catch { showToast("Could not copy — please copy manually", "error"); }
  };

  const openAffiliate = async (a) => {
    if (expanded === a.id) { setExpanded(null); return; }
    setExpanded(a.id);
    setPanelLoading(true);
    try {
      const [linksRes, pbRes] = await Promise.all([
        fetch(`${API_BASE}/api/affiliates/${a.id}/campaigns`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/affiliates/${a.id}/postback-urls`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const linksData = await linksRes.json();
      const pbData = await pbRes.json();
      setLinks(linksData.status === "SUCCESS" ? linksData.data : []);
      setPostbacks(pbData.status === "SUCCESS" ? pbData.data : []);
    } catch {
      showToast("Failed to load publisher details", "error");
    } finally {
      setPanelLoading(false);
    }
  };

  const addPostback = async (affId) => {
    const url = newPostback.trim();
    if (!url) return showToast("Enter a postback URL", "error");
    if (!isValidUrl(url)) return showToast("Postback URL must start with http:// or https://", "error");
    if (!url.includes("{click_id}")) return showToast("Postback URL must include the {click_id} macro", "error");
    setSavingPb(true);
    try {
      const res = await fetch(`${API_BASE}/api/affiliates/${affId}/postback-urls`, {
        method: "POST", headers: authHeaders,
        body: JSON.stringify({ postback_url: url }),
      });
      const data = await res.json();
      if (data.status === "SUCCESS") { setPostbacks(p => [data.data, ...p]); setNewPostback(""); showToast("Postback URL saved"); }
      else showToast(data.message || "Failed to save postback URL", "error");
    } catch {
      showToast("Network error while saving postback URL", "error");
    } finally {
      setSavingPb(false);
    }
  };

  const deletePostback = async (pbId) => {
    const prev = postbacks;
    setPostbacks(p => p.filter(x => x.id !== pbId));
    try {
      const res = await fetch(`${API_BASE}/api/affiliates/postback-urls/${pbId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { setPostbacks(prev); showToast("Failed to remove postback URL", "error"); }
    } catch {
      setPostbacks(prev);
      showToast("Network error while removing postback URL", "error");
    }
  };

  return (
    <CpaLayout>
      {toast && <div style={{ position: "fixed", top: 80, right: 24, zIndex: 9999, background: toast.type === "error" ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)", border: `1px solid ${toast.type === "error" ? "#fca5a5" : "#86efac"}`, color: toast.type === "error" ? "#dc2626" : "#16a34a", padding: "12px 20px", borderRadius: 12, fontSize: 13, maxWidth: 360 }}>{toast.msg}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={pageTitle}>Publishers</h1>
          <p style={{ color: "#9b7faa", fontSize: 13 }}>{affiliates.length} publishers · send us traffic on campaign tracking links, we forward conversions to their postback</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input style={{ ...input, width: 200 }} placeholder="Publisher name *" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
          <input style={{ ...input, width: 220 }} placeholder="Email (optional)" type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
          <button style={{ ...btn, opacity: adding ? 0.7 : 1 }} onClick={add} disabled={adding}>{adding ? "Adding..." : "+ Add Publisher"}</button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {affiliates.map(a => (
          <div key={a.id} style={{ background: "#fff", border: "1px solid #e8d0dc", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", cursor: "pointer", flexWrap: "wrap", gap: 10 }} onClick={() => openAffiliate(a)}>
              <div>
                <strong style={{ color: "#4a2f3f" }}>{a.name}</strong>
                <span style={{ color: "#b89ab0", fontSize: 12, marginLeft: 10 }}>{a.email || "—"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "#9b7faa", flexWrap: "wrap" }}>
                <span>Clicks: <b>{a.total_clicks}</b></span>
                <span>Conversions: <b>{a.total_conversions}</b></span>
                <span>Revenue: <b>{Number(a.total_revenue).toFixed(2)}</b></span>
                <span style={badge(a.status === "active" ? "green" : "red")} onClick={(e) => { e.stopPropagation(); toggleStatus(a); }}>
                  {a.status === "active" ? "● Active" : "● Paused"}
                </span>
                <span>{expanded === a.id ? "▲" : "▼"}</span>
              </div>
            </div>

            {expanded === a.id && (
              <div style={{ borderTop: "1px solid #f0e0e8", padding: "16px 18px", background: "#fdf6f9" }}>
                {panelLoading ? (
                  <div style={{ fontSize: 12, color: "#b89ab0" }}>Loading...</div>
                ) : (
                <>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontSize: 12, color: "#9b7faa" }}>Publisher Key:</span>
                  <code style={{ fontSize: 12, background: "#fff", padding: "3px 8px", borderRadius: 6 }}>{a.affiliate_key}</code>
                  <button style={{ ...btn, padding: "3px 10px", fontSize: 11 }} onClick={() => copy(a.affiliate_key, "Publisher key")}>Copy</button>
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, color: "#9b7faa", textTransform: "uppercase", marginBottom: 6 }}>Personalized Tracking Links</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
                  {links.map(l => (
                    <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", padding: "8px 12px", borderRadius: 10, border: "1px solid #eedde8", flexWrap: "wrap", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "#4a2f3f" }}>{l.name} <span style={{ color: "#b89ab0" }}>({l.vertical_name})</span></span>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <code style={{ fontSize: 11, color: "#9b7faa", wordBreak: "break-all" }}>{l.tracking_url}</code>
                        <button style={{ ...btn, padding: "3px 10px", fontSize: 11 }} onClick={() => copy(l.tracking_url, "Tracking link")}>Copy</button>
                      </div>
                    </div>
                  ))}
                  {!links.length && <div style={{ fontSize: 12, color: "#b89ab0" }}>No active campaigns yet.</div>}
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, color: "#9b7faa", textTransform: "uppercase", marginBottom: 6 }}>Postback URLs — we forward conversions here (S2S)</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <input style={{ ...input, flex: 1, minWidth: 260 }} placeholder="https://publisher-tracker.com/pb?click_id={click_id}&payout={payout}&status={status}" value={newPostback} onChange={e => setNewPostback(e.target.value)} onKeyDown={e => e.key === "Enter" && addPostback(a.id)} />
                  <button style={{ ...btn, padding: "8px 16px", opacity: savingPb ? 0.7 : 1 }} onClick={() => addPostback(a.id)} disabled={savingPb}>{savingPb ? "Saving..." : "Add"}</button>
                </div>
                <div style={{ fontSize: 11, color: "#b89ab0", marginBottom: 10 }}>Must include the <b>{"{click_id}"}</b> macro. Optional: <b>{"{payout}"}</b>, <b>{"{status}"}</b>, <b>{"{transaction_id}"}</b>.</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {postbacks.map(p => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", padding: "6px 12px", borderRadius: 10, border: "1px solid #eedde8", gap: 8, flexWrap: "wrap" }}>
                      <code style={{ fontSize: 11, color: "#4a2f3f", wordBreak: "break-all" }}>{p.postback_url}</code>
                      <button style={{ ...btnRed, padding: "3px 10px", fontSize: 11 }} onClick={() => deletePostback(p.id)}>Remove</button>
                    </div>
                  ))}
                  {!postbacks.length && <div style={{ fontSize: 12, color: "#b89ab0" }}>No postback URL set — conversions won't be forwarded to this publisher yet.</div>}
                </div>
                </>
                )}
              </div>
            )}
          </div>
        ))}
        {!affiliates.length && <div style={{ color: "#b89ab0", fontSize: 13 }}>No publishers yet — add one above.</div>}
      </div>
    </CpaLayout>
  );
}
