import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CpaLayout from "../../components/cpa/CpaLayout";
import { btn, btnRed, input, badge, pageTitle } from "../../styles/shared.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

export default function TrafficGroups() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [groups, setGroups] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", geo: "", carrier: "" });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [items, setItems] = useState([]);
  const [addCampaignId, setAddCampaignId] = useState("");
  const [addWeight, setAddWeight] = useState("100");

  useEffect(() => { if (!token) navigate("/login"); else { load(); loadCampaigns(); } }, []);
  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2800); };
  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/campaign-groups`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === "SUCCESS") setGroups(data.data);
      else showToast(data.message || "Failed to load traffic groups", "error");
    } catch {
      showToast("Network error while loading traffic groups", "error");
    }
  };
  const loadCampaigns = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/campaigns?status=active`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === "SUCCESS") setCampaigns(data.data);
    } catch { /* non-blocking */ }
  };

  const createGroup = async () => {
    if (!form.name.trim()) return showToast("Group name required", "error");
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/campaign-groups`, {
        method: "POST", headers: authHeaders,
        body: JSON.stringify({ name: form.name.trim(), geo: form.geo.trim(), carrier: form.carrier.trim() }),
      });
      const data = await res.json();
      if (data.status === "SUCCESS") { setGroups(g => [data.data, ...g]); setForm({ name: "", geo: "", carrier: "" }); setShowForm(false); showToast("Traffic group created"); }
      else showToast(data.message || "Failed to create group", "error");
    } catch {
      showToast("Network error while creating group", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (g) => {
    const ns = g.status === "active" ? "paused" : "active";
    const prev = groups;
    setGroups(l => l.map(x => x.id === g.id ? { ...x, status: ns } : x));
    try {
      const res = await fetch(`${API_BASE}/api/campaign-groups/${g.id}/status`, { method: "PATCH", headers: authHeaders, body: JSON.stringify({ status: ns }) });
      if (!res.ok) { setGroups(prev); showToast("Failed to update status", "error"); }
    } catch {
      setGroups(prev);
      showToast("Network error", "error");
    }
  };

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); showToast("Tracking URL copied!"); }
    catch { showToast("Could not copy — please copy manually", "error"); }
  };

  const openGroup = async (g) => {
    if (expandedId === g.id) { setExpandedId(null); return; }
    setExpandedId(g.id);
    try {
      const res = await fetch(`${API_BASE}/api/campaign-groups/${g.id}/items`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setItems(data.status === "SUCCESS" ? data.data : []);
    } catch {
      showToast("Failed to load campaigns in this group", "error");
    }
  };

  const addItem = async (groupId) => {
    if (!addCampaignId) return showToast("Select a campaign to add", "error");
    const w = Number(addWeight);
    if (isNaN(w) || w < 0 || w > 100) return showToast("Weight must be 0-100", "error");
    try {
      const res = await fetch(`${API_BASE}/api/campaign-groups/${groupId}/items`, {
        method: "POST", headers: authHeaders,
        body: JSON.stringify({ campaign_id: addCampaignId, weight: w }),
      });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        const camp = campaigns.find(c => c.id === Number(addCampaignId));
        setItems(it => [{ ...data.data, campaign_name: camp?.name, advertiser_name: camp?.advertiser_name, payout: camp?.payout, currency: camp?.currency, campaign_status: camp?.status }, ...it]);
        setGroups(g => g.map(x => x.id === groupId ? { ...x, campaign_count: (x.campaign_count || 0) + 1 } : x));
        setAddCampaignId(""); setAddWeight("100");
        showToast("Campaign added to group");
      } else {
        showToast(data.message || "Failed to add campaign", "error");
      }
    } catch {
      showToast("Network error while adding campaign", "error");
    }
  };

  const updateWeight = async (itemId, weight) => {
    const w = Number(weight);
    if (isNaN(w) || w < 0 || w > 100) return;
    setItems(it => it.map(x => x.id === itemId ? { ...x, weight: w } : x));
    try {
      await fetch(`${API_BASE}/api/campaign-groups/items/${itemId}`, { method: "PATCH", headers: authHeaders, body: JSON.stringify({ weight: w }) });
    } catch { /* silently retried on next Apply */ }
  };

  const removeItem = async (itemId, groupId) => {
    const prev = items;
    setItems(it => it.filter(x => x.id !== itemId));
    try {
      const res = await fetch(`${API_BASE}/api/campaign-groups/items/${itemId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setGroups(g => g.map(x => x.id === groupId ? { ...x, campaign_count: Math.max(0, (x.campaign_count || 1) - 1) } : x));
      else { setItems(prev); showToast("Failed to remove campaign", "error"); }
    } catch {
      setItems(prev);
      showToast("Network error while removing campaign", "error");
    }
  };

  return (
    <CpaLayout>
      {toast && <div style={{ position: "fixed", top: 80, right: 24, zIndex: 9999, background: toast.type === "error" ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)", border: `1px solid ${toast.type === "error" ? "#fca5a5" : "#86efac"}`, color: toast.type === "error" ? "#dc2626" : "#16a34a", padding: "12px 20px", borderRadius: 12, fontSize: 13, maxWidth: 380 }}>{toast.msg}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={pageTitle}>Traffic Groups</h1>
          <p style={{ color: "#9b7faa", fontSize: 13 }}>One tracking URL, split by weight % across multiple campaigns (e.g. same Geo + Carrier)</p>
        </div>
        <button style={btn} onClick={() => setShowForm(s => !s)}>{showForm ? "Cancel" : "+ New Traffic Group"}</button>
      </div>

      {showForm && (
        <div style={{ background: "#fff", border: "1px solid #e8d0dc", borderRadius: 16, padding: 20, marginBottom: 24, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          <input style={input} placeholder="Group name (e.g. Zain IQ Bundle)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input style={input} placeholder="Geo (e.g. IQ) — optional label" value={form.geo} onChange={e => setForm(f => ({ ...f, geo: e.target.value }))} />
          <input style={input} placeholder="Carrier (e.g. Zain) — optional label" value={form.carrier} onChange={e => setForm(f => ({ ...f, carrier: e.target.value }))} />
          <button style={{ ...btn, gridColumn: "span 3", opacity: saving ? 0.7 : 1 }} onClick={createGroup} disabled={saving}>{saving ? "Creating..." : "Create Traffic Group"}</button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {groups.map(g => (
          <div key={g.id} style={{ background: "#fff", border: "1px solid #e8d0dc", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", cursor: "pointer", flexWrap: "wrap", gap: 10 }} onClick={() => openGroup(g)}>
              <div>
                <strong style={{ color: "#4a2f3f" }}>{g.name}</strong>
                <span style={{ color: "#b89ab0", fontSize: 12, marginLeft: 10 }}>{g.geo || ""} {g.carrier ? `/ ${g.carrier}` : ""}</span>
                <span style={{ marginLeft: 10, fontSize: 10, background: "#f5eef8", color: "#9b7faa", padding: "2px 8px", borderRadius: 10 }}>{g.campaign_count || 0} campaigns</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <code style={{ fontSize: 11, background: "#f5eef8", padding: "3px 8px", borderRadius: 6 }}>{g.tracking_url}</code>
                <button style={{ ...btn, padding: "4px 10px", fontSize: 11 }} onClick={(e) => { e.stopPropagation(); copy(g.tracking_url); }}>Copy</button>
                <span style={badge(g.status === "active" ? "green" : "red")} onClick={(e) => { e.stopPropagation(); toggleStatus(g); }}>
                  {g.status === "active" ? "● Active" : "● Paused"}
                </span>
                <span>{expandedId === g.id ? "▲" : "▼"}</span>
              </div>
            </div>

            {expandedId === g.id && (
              <div style={{ borderTop: "1px solid #f0e0e8", padding: "16px 18px", background: "#fdf6f9" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9b7faa", textTransform: "uppercase", marginBottom: 8 }}>
                  Campaigns in this group — traffic splits proportionally by weight
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                  {items.map(it => (
                    <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", padding: "8px 12px", borderRadius: 10, border: "1px solid #eedde8", flexWrap: "wrap", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "#4a2f3f" }}>{it.campaign_name} <span style={{ color: "#b89ab0" }}>({it.advertiser_name} · {it.currency} {it.payout})</span></span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="number" min="0" max="100" style={{ ...input, width: 70, padding: "5px 8px" }} value={it.weight} onChange={e => updateWeight(it.id, e.target.value)} />
                        <span style={{ fontSize: 11, color: "#9b7faa" }}>%</span>
                        <button style={{ ...btnRed, padding: "3px 10px", fontSize: 11 }} onClick={() => removeItem(it.id, g.id)}>Remove</button>
                      </div>
                    </div>
                  ))}
                  {!items.length && <div style={{ fontSize: 12, color: "#b89ab0" }}>No campaigns in this group yet.</div>}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <select style={{ ...input, flex: 1, minWidth: 200 }} value={addCampaignId} onChange={e => setAddCampaignId(e.target.value)}>
                    <option value="">Select campaign to add...</option>
                    {campaigns.filter(c => !items.some(it => it.campaign_id === c.id)).map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.advertiser_name})</option>
                    ))}
                  </select>
                  <input type="number" min="0" max="100" style={{ ...input, width: 90 }} placeholder="Weight %" value={addWeight} onChange={e => setAddWeight(e.target.value)} />
                  <button style={btn} onClick={() => addItem(g.id)}>+ Add</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {!groups.length && <div style={{ color: "#b89ab0", fontSize: 13 }}>No traffic groups yet — create one above.</div>}
      </div>
    </CpaLayout>
  );
}
