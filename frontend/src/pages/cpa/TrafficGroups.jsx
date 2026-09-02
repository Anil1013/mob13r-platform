import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CpaLayout from "../../components/cpa/CpaLayout";
import { btn, btnRed, input, badge, pageTitle } from "../../styles/shared.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

export default function TrafficGroups() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = localStorage.getItem("token");
  const verticalId = searchParams.get("vertical_id") || "";
  const [groups, setGroups] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", geo: "", carrier: "", affiliate_id: "" });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [items, setItems] = useState([]);
  const [addCampaignId, setAddCampaignId] = useState("");
  const [addWeight, setAddWeight] = useState("100");
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", geo: "", carrier: "", affiliate_id: "" });

  useEffect(() => { if (!token) navigate("/login"); else { load(); loadCampaigns(); loadAffiliates(); } }, [searchParams.get("vertical_id")]);
  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2800); };
  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const load = async () => {
    try {
      const vParam = verticalId ? `?vertical_id=${verticalId}` : "";
      const res = await fetch(`${API_BASE}/api/campaign-groups${vParam}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === "SUCCESS") setGroups(data.data);
      else showToast(data.message || "Failed to load traffic groups", "error");
    } catch {
      showToast("Network error while loading traffic groups", "error");
    }
  };
  const loadCampaigns = async () => {
    try {
      const vParam = verticalId ? `&vertical_id=${verticalId}` : "";
      const res = await fetch(`${API_BASE}/api/campaigns?status=active${vParam}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === "SUCCESS") setCampaigns(data.data);
    } catch { /* non-blocking */ }
  };
  const loadAffiliates = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/affiliates`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === "SUCCESS") setAffiliates(data.data);
    } catch { /* non-blocking */ }
  };

  const createGroup = async () => {
    if (!form.name.trim()) return showToast("Group name required", "error");
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/campaign-groups`, {
        method: "POST", headers: authHeaders,
        body: JSON.stringify({ name: form.name.trim(), geo: form.geo.trim(), carrier: form.carrier.trim(), affiliate_id: form.affiliate_id || null }),
      });
      const data = await res.json();
      if (data.status === "SUCCESS") { setGroups(g => [data.data, ...g]); setForm({ name: "", geo: "", carrier: "", affiliate_id: "" }); setShowForm(false); showToast("Traffic group created"); }
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

  const startEditGroup = (g, e) => {
    e.stopPropagation();
    setEditingGroupId(g.id);
    setEditForm({ name: g.name, geo: g.geo || "", carrier: g.carrier || "", affiliate_id: g.affiliate_id || "" });
  };

  const saveEditGroup = async (id) => {
    if (!editForm.name.trim()) return showToast("Group name required", "error");
    try {
      const res = await fetch(`${API_BASE}/api/campaign-groups/${id}`, {
        method: "PATCH", headers: authHeaders,
        body: JSON.stringify({ name: editForm.name.trim(), geo: editForm.geo.trim(), carrier: editForm.carrier.trim(), affiliate_id: editForm.affiliate_id || null }),
      });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        setGroups(g => g.map(x => x.id === id ? data.data : x));
        setEditingGroupId(null);
        showToast("Traffic group updated");
      } else {
        showToast(data.message || "Failed to update group", "error");
      }
    } catch {
      showToast("Network error while updating group", "error");
    }
  };

  const deleteGroup = async (g, e) => {
    e.stopPropagation();
    if (g.status === "active") return showToast("Pause this traffic group before deleting it", "error");
    if (!confirm(`Delete traffic group "${g.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/campaign-groups/${g.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === "SUCCESS") { setGroups(gs => gs.filter(x => x.id !== g.id)); showToast("Traffic group deleted"); }
      else showToast(data.message || "Failed to delete group", "error");
    } catch {
      showToast("Network error while deleting group", "error");
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
          <p style={{ color: "#9b7faa", fontSize: 13 }}>One tracking URL, split by relative weight across multiple campaigns (e.g. same Geo + Carrier) — weights don't need to sum to 100</p>
          {verticalId && <p style={{ color: "#9b7faa", fontSize: 12, marginTop: 2 }}>Filtered to the vertical selected in the sidebar — click it again to clear.</p>}
        </div>
        <button style={btn} onClick={() => setShowForm(s => !s)}>{showForm ? "Cancel" : "+ New Traffic Group"}</button>
      </div>

      {showForm && (
        <div style={{ background: "#fff", border: "1px solid #e8d0dc", borderRadius: 16, padding: 20, marginBottom: 24, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          <input style={input} placeholder="Group name (e.g. Zain IQ Bundle)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input style={input} placeholder="Geo (e.g. IQ)" value={form.geo} onChange={e => setForm(f => ({ ...f, geo: e.target.value }))} />
          <input style={input} placeholder="Carrier (e.g. Zain)" value={form.carrier} onChange={e => setForm(f => ({ ...f, carrier: e.target.value }))} />
          <select style={{ ...input, gridColumn: "span 3" }} value={form.affiliate_id} onChange={e => setForm(f => ({ ...f, affiliate_id: e.target.value }))}>
            <option value="">All Publishers (generic — applies to anyone without their own group for this Geo/Carrier)</option>
            {affiliates.map(a => <option key={a.id} value={a.id}>Only for: {a.name}</option>)}
          </select>
          <div style={{ gridColumn: "span 3", fontSize: 11.5, color: "#9b7faa" }}>
            A specific publisher's own group always takes priority over the generic one for the same Geo/Carrier — you can have both at once.
          </div>
          <button style={{ ...btn, gridColumn: "span 3", opacity: saving ? 0.7 : 1 }} onClick={createGroup} disabled={saving}>{saving ? "Creating..." : "Create Traffic Group"}</button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {groups.map(g => (
          <div key={g.id} style={{ background: "#fff", border: "1px solid #e8d0dc", borderRadius: 16, overflow: "hidden" }}>
            {editingGroupId === g.id ? (
              <div style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                <input style={input} placeholder="Group name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                <input style={input} placeholder="Geo (e.g. IQ)" value={editForm.geo} onChange={e => setEditForm(f => ({ ...f, geo: e.target.value }))} />
                <input style={input} placeholder="Carrier (e.g. Zain)" value={editForm.carrier} onChange={e => setEditForm(f => ({ ...f, carrier: e.target.value }))} />
                <select style={{ ...input, gridColumn: "span 3" }} value={editForm.affiliate_id} onChange={e => setEditForm(f => ({ ...f, affiliate_id: e.target.value }))}>
                  <option value="">All Publishers (generic)</option>
                  {affiliates.map(a => <option key={a.id} value={a.id}>Only for: {a.name}</option>)}
                </select>
                <div style={{ gridColumn: "span 3", display: "flex", gap: 8 }}>
                  <button style={btn} onClick={() => saveEditGroup(g.id)}>Save</button>
                  <button style={{ ...btn, background: "#f5eef8", color: "#4a2f3f" }} onClick={() => setEditingGroupId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", cursor: "pointer", flexWrap: "wrap", gap: 10 }} onClick={() => openGroup(g)}>
              <div>
                <strong style={{ color: "#4a2f3f" }}>{g.name}</strong>
                <span style={{ color: "#b89ab0", fontSize: 12, marginLeft: 10 }}>{g.geo || ""} {g.carrier ? `/ ${g.carrier}` : ""}</span>
                <span style={{ marginLeft: 10, fontSize: 10, background: "#f5eef8", color: "#9b7faa", padding: "2px 8px", borderRadius: 10 }}>{g.campaign_count || 0} campaigns</span>
                <span style={{ marginLeft: 6, fontSize: 10, background: g.affiliate_id ? "rgba(124,58,237,0.1)" : "rgba(148,163,184,0.15)", color: g.affiliate_id ? "#7c3aed" : "#64748b", padding: "2px 8px", borderRadius: 10 }}>
                  {g.affiliate_id ? `Only: ${g.affiliate_name}` : "All Publishers"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <code style={{ fontSize: 11, background: "#f5eef8", padding: "3px 8px", borderRadius: 6 }}>{g.tracking_url}</code>
                <button style={{ ...btn, padding: "4px 10px", fontSize: 11 }} onClick={(e) => { e.stopPropagation(); copy(g.tracking_url); }}>Copy</button>
                <button style={{ ...btn, padding: "4px 10px", fontSize: 11, background: "#f5eef8", color: "#4a2f3f" }} onClick={(e) => startEditGroup(g, e)}>Edit</button>
                <button style={{ ...btnRed, padding: "4px 10px", fontSize: 11 }} onClick={(e) => deleteGroup(g, e)}>Delete</button>
                <span style={badge(g.status === "active" ? "green" : "red")} onClick={(e) => { e.stopPropagation(); toggleStatus(g); }}>
                  {g.status === "active" ? "● Active" : "● Paused"}
                </span>
                <span>{expandedId === g.id ? "▲" : "▼"}</span>
              </div>
            </div>
            )}

            {expandedId === g.id && (
              <div style={{ borderTop: "1px solid #f0e0e8", padding: "16px 18px", background: "#fdf6f9" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9b7faa", textTransform: "uppercase", marginBottom: 8 }}>
                  Campaigns in this group — traffic splits by relative weight (doesn't need to add up to 100)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                  {items.map(it => {
                    const totalWeight = items.reduce((s, x) => s + Number(x.weight || 0), 0);
                    const effectiveShare = totalWeight > 0 ? ((Number(it.weight || 0) / totalWeight) * 100).toFixed(1) : "0.0";
                    return (
                    <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", padding: "8px 12px", borderRadius: 10, border: "1px solid #eedde8", flexWrap: "wrap", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "#4a2f3f" }}>{it.campaign_name} <span style={{ color: "#b89ab0" }}>({it.advertiser_name} · {it.currency} {it.payout})</span></span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 10, color: "#16a34a", background: "rgba(34,197,94,0.1)", padding: "2px 8px", borderRadius: 10 }}>≈{effectiveShare}% of traffic</span>
                        <input type="number" min="0" max="100" style={{ ...input, width: 70, padding: "5px 8px" }} value={it.weight} onChange={e => updateWeight(it.id, e.target.value)} />
                        <span style={{ fontSize: 11, color: "#9b7faa" }}>weight</span>
                        <button style={{ ...btnRed, padding: "3px 10px", fontSize: 11 }} onClick={() => removeItem(it.id, g.id)}>Remove</button>
                      </div>
                    </div>
                    );
                  })}
                  {!items.length && <div style={{ fontSize: 12, color: "#b89ab0" }}>No campaigns in this group yet.</div>}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <select style={{ ...input, flex: 1, minWidth: 200 }} value={addCampaignId} onChange={e => setAddCampaignId(e.target.value)}>
                    <option value="">Select campaign to add...</option>
                    {campaigns
                      .filter(c => !items.some(it => it.campaign_id === c.id))
                      .filter(c => (!g.geo || !c.geo || c.geo === g.geo) && (!g.carrier || !c.carrier || c.carrier === g.carrier))
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.advertiser_name})</option>
                      ))}
                  </select>
                  <input type="number" min="0" max="100" style={{ ...input, width: 90 }} placeholder="Weight" value={addWeight} onChange={e => setAddWeight(e.target.value)} />
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
