import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

const token = () => localStorage.getItem("token");
const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

export default function OfferGroups() {
  const [groups, setGroups] = useState([]);
  const [offers, setOffers] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [msg, setMsg] = useState(null);

  const [form, setForm] = useState({
    name: "", geo: "", carrier: "", description: "",
    items: [], publisher_ids: []
  });

  const load = async () => {
    setLoading(true);
    const [gRes, oRes, pRes] = await Promise.all([
      fetch(`${API_BASE}/api/offer-groups`, { headers: headers() }),
      fetch(`${API_BASE}/api/offers`, { headers: headers() }),
      fetch(`${API_BASE}/api/publishers`, { headers: headers() }),
    ]);
    const [gData, oData, pData] = await Promise.all([gRes.json(), oRes.json(), pRes.json()]);
    setGroups(gData.data || []);
    setOffers(oData.data || oData || []);
    setPublishers(pData.data || pData || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalWeight = form.items.reduce((s, i) => s + Number(i.weight || 0), 0);

  const addItem = () => {
    setForm(f => ({ ...f, items: [...f.items, { offer_id: "", weight: 0 }] }));
  };

  const updateItem = (idx, field, val) => {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: val };
      return { ...f, items };
    });
  };

  const removeItem = (idx) => {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const autoBalance = () => {
    const n = form.items.length;
    if (!n) return;
    const base = Math.floor(100 / n);
    const rem = 100 - base * n;
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) => ({ ...item, weight: base + (i === 0 ? rem : 0) }))
    }));
  };

  const togglePublisher = (id) => {
    setForm(f => ({
      ...f,
      publisher_ids: f.publisher_ids.includes(id)
        ? f.publisher_ids.filter(p => p !== id)
        : [...f.publisher_ids, id]
    }));
  };

  const save = async () => {
    if (!form.name) return setMsg({ type: "error", text: "Group name required" });
    if (form.items.length === 0) return setMsg({ type: "error", text: "Add at least one offer" });
    if (totalWeight !== 100) return setMsg({ type: "error", text: `Weights must sum to 100 (currently ${totalWeight})` });

    const url = editGroup
      ? `${API_BASE}/api/offer-groups/${editGroup.id}`
      : `${API_BASE}/api/offer-groups`;
    const method = editGroup ? "PUT" : "POST";

    const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(form) });
    const data = await res.json();

    if (data.status === "SUCCESS") {
      setMsg({ type: "success", text: editGroup ? "Group updated!" : "Group created!" });
      setShowCreate(false);
      setEditGroup(null);
      setForm({ name: "", geo: "", carrier: "", description: "", items: [], publisher_ids: [] });
      load();
    } else {
      setMsg({ type: "error", text: data.error });
    }
    setTimeout(() => setMsg(null), 3000);
  };

  const deleteGroup = async (id, name) => {
    if (!confirm(`Delete group "${name}"?`)) return;
    await fetch(`${API_BASE}/api/offer-groups/${id}`, { method: "DELETE", headers: headers() });
    load();
  };

  const startEdit = (g) => {
    setEditGroup(g);
    setForm({
      name: g.name, geo: g.geo || "", carrier: g.carrier || "",
      description: g.description || "",
      items: (g.items || []).map(i => ({ offer_id: i.offer_id, weight: i.weight })),
      publisher_ids: (g.publishers || []).map(p => p.id),
    });
    setShowCreate(true);
  };

  const copyURL = (groupId, apiKey) => {
    if (!apiKey) { setMsg({ type: "error", text: "This publisher has no API key on file." }); setTimeout(() => setMsg(null), 3000); return; }
    const url = `https://backend.mob13r.com/api/publisher/group/${groupId}/pin/send?msisdn={msisdn}&geo={geo}&carrier={carrier}&x-api-key=${apiKey}`;
    navigator.clipboard.writeText(url);
    setMsg({ type: "success", text: "URL copied!" });
    setTimeout(() => setMsg(null), 2000);
  };

  const s = {
    page: { padding: 24, fontFamily: "'Lora', serif", background: "linear-gradient(180deg,#fdf8fb 0%,#fbf3f7 100%)", minHeight: "100vh", maxWidth: 1440, margin: "0 auto" },
    title: { fontSize: 22, fontWeight: 700, color: "#2d1b30", marginBottom: 4 },
    sub: { color: "#a888b3", fontSize: 13, marginBottom: 24 },
    card: { background: "#fff", border: "1px solid #f0e5ec", borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 8px 30px rgba(124,58,237,0.09), 0 2px 6px rgba(0,0,0,0.03)" },
    btn: { padding: "9px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7c3aed,#d4709a)", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13, boxShadow: "0 4px 12px rgba(124,58,237,0.25)", fontFamily: "'Lora',serif" },
    btnGreen: { padding: "9px 18px", borderRadius: 10, border: "none", background: "#16a34a", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13, fontFamily: "'Lora',serif" },
    btnGray: { padding: "9px 18px", borderRadius: 10, border: "1px solid #ecdde6", background: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "'Lora',serif", color: "#8b6a9a" },
    input: { width: "100%", padding: "9px 12px", borderRadius: 10, border: "1.5px solid #ecdde6", fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "'Lora',serif" },
    label: { fontSize: 11, color: "#8b6a9a", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 5 },
    grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 },
    msg: (t) => ({ padding: "10px 16px", borderRadius: 10, marginBottom: 14, fontSize: 13, fontWeight: 500, background: t === "success" ? "#ecfdf5" : "#fef2f2", color: t === "success" ? "#16a34a" : "#dc2626", border: `1px solid ${t === "success" ? "#bbf7d0" : "#fecaca"}` }),
    tag: { display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 },
  };

  const weightColor = totalWeight === 100 ? "#16a34a" : totalWeight > 100 ? "#dc2626" : "#f59e0b";

  return (
    <>
      <Navbar />
      <div style={s.page} className="m13-fade-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <div style={s.title}>🔀 Offer Groups</div>
            <div style={s.sub}>Traffic distribution across multiple offers with weighted routing</div>
          </div>
          <button className="m13-btn" style={s.btn} onClick={() => { setShowCreate(true); setEditGroup(null); setForm({ name:"", geo:"", carrier:"", description:"", items:[], publisher_ids:[] }); }}>
            + Create Group
          </button>
        </div>

        {msg && <div style={s.msg(msg.type)}>{msg.text}</div>}

        {/* CREATE / EDIT FORM */}
        {showCreate && (
          <div style={s.card}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
              {editGroup ? `Edit: ${editGroup.name}` : "Create New Offer Group"}
            </div>

            <div style={s.grid3}>
              <div>
                <span style={s.label}>Group Name *</span>
                <input style={s.input} placeholder="e.g. Zain IQ - Multi Offer" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
              </div>
              <div>
                <span style={s.label}>GEO</span>
                <input style={s.input} placeholder="e.g. IQ" value={form.geo} onChange={e => setForm(f => ({...f, geo: e.target.value.toUpperCase()}))} />
              </div>
              <div>
                <span style={s.label}>Carrier</span>
                <input style={s.input} placeholder="e.g. Zain" value={form.carrier} onChange={e => setForm(f => ({...f, carrier: e.target.value}))} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <span style={s.label}>Description (optional)</span>
              <input style={s.input} placeholder="Notes about this group..." value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
            </div>

            {/* OFFERS WITH WEIGHTS */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={s.label}>Offers & Weights *</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: weightColor, fontWeight: 700 }}>Total: {totalWeight}% {totalWeight !== 100 && "(must be 100%)"}</span>
                  <button style={s.btnGray} onClick={autoBalance}>⚖ Auto Balance</button>
                  <button className="m13-btn" style={s.btnGreen} onClick={addItem}>+ Add Offer</button>
                </div>
              </div>

              {form.items.map((item, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 100px 36px", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <select style={s.input} value={item.offer_id} onChange={e => updateItem(idx, "offer_id", e.target.value)}>
                    <option value="">-- Select Offer --</option>
                    {offers.map(o => <option key={o.id} value={o.id}>{o.service_name} | {o.geo} | {o.carrier}</option>)}
                  </select>
                  <div style={{ position: "relative" }}>
                    <input style={{...s.input, paddingRight: 24}} type="number" min="0" max="100" placeholder="Weight"
                      value={item.weight} onChange={e => updateItem(idx, "weight", Number(e.target.value))} />
                    <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 13 }}>%</span>
                  </div>
                  <button onClick={() => removeItem(idx)} style={{ border: "none", background: "#fee2e2", color: "#dc2626", borderRadius: 8, cursor: "pointer", padding: "9px 10px", fontWeight: 700 }}>✕</button>
                </div>
              ))}

              {form.items.length === 0 && (
                <div style={{ padding: 16, textAlign: "center", color: "#94a3b8", border: "2px dashed #e2e8f0", borderRadius: 8, fontSize: 13 }}>
                  Click "+ Add Offer" to add offers to this group
                </div>
              )}

              {/* Weight visualization */}
              {form.items.length > 0 && totalWeight > 0 && (
                <div style={{ marginTop: 10, borderRadius: 8, overflow: "hidden", height: 20, display: "flex" }}>
                  {form.items.map((item, idx) => {
                    const colors = ["#7c3aed","#3b82f6","#16a34a","#f59e0b","#8b5cf6","#06b6d4"];
                    const o = offers.find(o => String(o.id) === String(item.offer_id));
                    return (
                      <div key={idx} title={`${o?.service_name || "Offer"}: ${item.weight}%`}
                        style={{ width: `${item.weight}%`, background: colors[idx % colors.length], display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>{item.weight > 5 ? `${item.weight}%` : ""}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PUBLISHERS */}
            <div style={{ marginBottom: 16 }}>
              <span style={s.label}>Assign Publishers</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                {publishers.map(p => (
                  <div key={p.id} onClick={() => togglePublisher(p.id)}
                    style={{ padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: 600,
                      background: form.publisher_ids.includes(p.id) ? "#7c3aed" : "#f1f5f9",
                      color: form.publisher_ids.includes(p.id) ? "#fff" : "#475569",
                      border: form.publisher_ids.includes(p.id) ? "2px solid #7c3aed" : "2px solid transparent",
                    }}>
                    {form.publisher_ids.includes(p.id) ? "✓ " : ""}{p.name}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="m13-btn" style={s.btnGreen} onClick={save}>{editGroup ? "Update Group" : "Create Group"}</button>
              <button style={s.btnGray} onClick={() => { setShowCreate(false); setEditGroup(null); }}>Cancel</button>
            </div>
          </div>
        )}

        {/* GROUPS LIST */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <span className="m13-spinner" />
            <div style={{ marginTop: 10, color: "#a888b3", fontSize: 13 }}>Loading offer groups...</div>
          </div>
        ) : groups.length === 0 ? (
          <div style={{ ...s.card, textAlign: "center", color: "#94a3b8", padding: 40 }}>
            No offer groups yet. Create one to start distributing traffic!
          </div>
        ) : groups.map(g => (
          <div key={g.id} className="m13-card-hover" style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#2d1b30", marginBottom: 4 }}>
                  {g.name}
                  <span style={{ ...s.tag, background: g.status === "active" ? "#dcfce7" : "#fee2e2", color: g.status === "active" ? "#16a34a" : "#dc2626", marginLeft: 8 }}>
                    {g.status}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  {g.geo && <span style={{ ...s.tag, background: "#e8f4fd", color: "#0369a1", marginRight: 6 }}>{g.geo}</span>}
                  {g.carrier && <span style={{ ...s.tag, background: "#f3e8ff", color: "#7c3aed", marginRight: 6 }}>{g.carrier}</span>}
                  <span style={{ color: "#94a3b8" }}>{g.offer_count} offers</span>
                </div>
                {g.description && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{g.description}</div>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={s.btnGray} onClick={() => startEdit(g)}>Edit</button>
                <button style={{ ...s.btnGray, color: "#dc2626" }} onClick={() => deleteGroup(g.id, g.name)}>Delete</button>
              </div>
            </div>

            {/* Offers breakdown */}
            {g.items?.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 600, textTransform: "uppercase" }}>Traffic Distribution</div>
                <div style={{ borderRadius: 8, overflow: "hidden", height: 28, display: "flex", marginBottom: 10 }}>
                  {g.items.map((item, idx) => {
                    const colors = ["#7c3aed","#3b82f6","#16a34a","#f59e0b","#8b5cf6","#06b6d4"];
                    return (
                      <div key={idx} title={`${item.offer_name}: ${item.weight}%`}
                        style={{ width: `${item.weight}%`, background: colors[idx % colors.length], display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <span style={{ color:"#fff", fontSize:11, fontWeight:700 }}>{item.weight > 8 ? `${item.weight}%` : ""}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {g.items.map((item, idx) => {
                    const colors = ["#7c3aed","#3b82f6","#16a34a","#f59e0b","#8b5cf6","#06b6d4"];
                    return (
                      <div key={idx} style={{ display:"flex", alignItems:"center", gap:6, fontSize:13 }}>
                        <span style={{ width:10, height:10, borderRadius:"50%", background:colors[idx%colors.length], display:"inline-block" }}/>
                        <span style={{ fontWeight:600 }}>{item.offer_name}</span>
                        <span style={{ color:"#94a3b8" }}>{item.weight}%</span>
                        <span style={{ color:"#cbd5e1" }}>|</span>
                        <span style={{ color:"#64748b", fontSize:12 }}>{item.carrier}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Publishers + URL */}
            {g.publishers?.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f0f0f0" }}>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 600, textTransform: "uppercase" }}>Assigned Publishers</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {g.publishers.map(p => (
                    <div key={p.id} style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ ...s.tag, background:"#f1f5f9", color:"#475569", padding:"4px 10px" }}>{p.name}</span>
                      <button onClick={() => copyURL(g.id, p.api_key)}
                        style={{ fontSize:11, padding:"3px 10px", borderRadius:6, border:"1px solid #e2e8f0", background:"#fff", cursor:"pointer", color:"#0369a1" }}>
                        📋 Copy URL
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 8, padding: "8px 12px", background: "#f8fafc", borderRadius: 8, fontFamily:"monospace", fontSize:11, color:"#475569", wordBreak:"break-all" }}>
                  https://backend.mob13r.com/api/publisher/group/{g.id}/pin/send?msisdn={"{msisdn}"}&geo={"{geo}"}&carrier={"{carrier}"}&x-api-key=pub_xxx
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
