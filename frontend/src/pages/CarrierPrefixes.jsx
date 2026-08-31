import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

const API_BASE = "https://backend.mob13r.com";

const CARRIERS_BY_GEO = {
  AE: ["Etisalat", "Du"],
  PS: ["Jawwal", "Ooredoo"],
  SA: ["STC", "Mobily", "Zain"],
  IQ: ["Zain", "Asiacell", "Korek", "Umniah"],
  LK: ["Dialog", "Mobitel", "Airtel", "Hutch"],
  QA: ["Ooredoo", "Vodafone"],
  OM: ["Ooredoo", "Omantel", "Vodafone"],
};

export default function CarrierPrefixes() {
  const token = localStorage.getItem("token");
  const [rows, setRows] = useState([]);
  const [filterGeo, setFilterGeo] = useState("");
  const [filterCarrier, setFilterCarrier] = useState("");
  const [form, setForm] = useState({ carrier: "", geo: "", prefix: "" });
  const [customCarrier, setCustomCarrier] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  // Geos + calling codes — live from the dashboard, not hardcoded
  const [geos, setGeos] = useState([]);
  const [geoForm, setGeoForm] = useState({ code: "", name: "", calling_code: "" });
  const [editingGeoId, setEditingGeoId] = useState(null);
  const [editingGeoDraft, setEditingGeoDraft] = useState({ name: "", calling_code: "" });
  const [geoMsg, setGeoMsg] = useState(null);
  const [geoFilterCountry, setGeoFilterCountry] = useState("");
  const [geoFilterCallingCode, setGeoFilterCallingCode] = useState("");

  const GEO_NAMES = Object.fromEntries(geos.map(g => [g.code, g.name]));

  const filteredGeos = geos.filter(g => {
    if (geoFilterCountry && g.code !== geoFilterCountry) return false;
    if (geoFilterCallingCode.trim() && !(g.calling_code || "").toLowerCase().includes(geoFilterCallingCode.trim().toLowerCase())) return false;
    return true;
  });

  const loadGeos = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/geos`);
      const data = await res.json();
      if (data.status === "SUCCESS") setGeos([...data.data].sort((a, b) => a.code.localeCompare(b.code)));
    } catch (e) { console.error(e); }
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterGeo) params.set("geo", filterGeo);
      if (filterCarrier) params.set("carrier", filterCarrier);
      const res = await fetch(`${API_BASE}/api/carrier-prefixes?${params}`);
      const data = await res.json();
      setRows((data.data || []).sort((a, b) =>
        a.geo.localeCompare(b.geo) || a.carrier.localeCompare(b.carrier) || a.prefix.localeCompare(b.prefix)
      ));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadGeos(); }, []);
  useEffect(() => { load(); }, [filterGeo, filterCarrier]);

  const finalCarrier = form.carrier === "__custom__" ? customCarrier : form.carrier;
  const finalGeo = form.geo === "__other__" ? (form.customGeo || "") : form.geo;

  const add = async () => {
    if (!finalCarrier || !finalGeo || !form.prefix) {
      setMsg({ type: "error", text: "Sab fields required hain" });
      setTimeout(() => setMsg(null), 3000);
      return;
    }
    const res = await fetch(`${API_BASE}/api/carrier-prefixes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ carrier: finalCarrier, geo: finalGeo, prefix: form.prefix }),
    });
    const data = await res.json();
    if (data.status === "SUCCESS") {
      setMsg({ type: "success", text: `✅ ${finalCarrier} (${finalGeo}) - ${form.prefix} add ho gaya!` });
      setForm({ carrier: "", geo: "", prefix: "" });
      setCustomCarrier("");
      load();
    } else {
      setMsg({ type: "error", text: data.error || "Failed" });
    }
    setTimeout(() => setMsg(null), 3000);
  };

  const remove = async (id, carrier, geo) => {
    if (!confirm(`Delete ${carrier} (${geo})?`)) return;
    await fetch(`${API_BASE}/api/carrier-prefixes/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    load();
  };

  const addGeo = async () => {
    if (!geoForm.code.trim() || !geoForm.name.trim()) {
      setGeoMsg({ type: "error", text: "Country code aur name required hain" });
      setTimeout(() => setGeoMsg(null), 3000);
      return;
    }
    const res = await fetch(`${API_BASE}/api/geos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(geoForm),
    });
    const data = await res.json();
    if (data.status === "SUCCESS") {
      setGeoMsg({ type: "success", text: `✅ ${geoForm.name} add ho gaya!` });
      setGeoForm({ code: "", name: "", calling_code: "" });
      loadGeos();
    } else {
      setGeoMsg({ type: "error", text: data.error || "Failed" });
    }
    setTimeout(() => setGeoMsg(null), 3000);
  };

  const startEditGeo = (g) => {
    setEditingGeoId(g.id);
    setEditingGeoDraft({ name: g.name, calling_code: g.calling_code || "" });
  };

  const saveEditGeo = async (id) => {
    const res = await fetch(`${API_BASE}/api/geos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(editingGeoDraft),
    });
    const data = await res.json();
    if (data.status === "SUCCESS") {
      setEditingGeoId(null);
      loadGeos();
    } else {
      alert(data.error || "Failed to save");
    }
  };

  const removeGeo = async (id, name) => {
    if (!confirm(`Delete ${name}? Existing offers using this geo won't be affected, but it will disappear from dropdowns.`)) return;
    await fetch(`${API_BASE}/api/geos/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    loadGeos();
  };

  const s = {
    page: { padding: "24px", fontFamily: "'Lora', sans-serif", background: "#f5f6fa", minHeight: "100vh" },
    title: { fontSize: "22px", fontWeight: "700", marginBottom: "2px", color: "#1a1a2e" },
    sub: { color: "#999", fontSize: "13px", marginBottom: "24px" },
    card: { background: "#fff", borderRadius: "12px", padding: "20px", marginBottom: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" },
    label: { fontSize: "11px", color: "#666", marginBottom: "5px", display: "block", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" },
    input: { width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #e0e0e0", fontSize: "14px", boxSizing: "border-box", outline: "none" },
    select: { width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #e0e0e0", fontSize: "14px", background: "#fff", boxSizing: "border-box" },
    btn: { padding: "10px 22px", borderRadius: "8px", border: "none", background: "#e94560", color: "#fff", fontWeight: "600", cursor: "pointer", fontSize: "14px" },
    btnDel: { padding: "4px 10px", borderRadius: "6px", border: "none", background: "#fff0f0", color: "#dc2626", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
    btnEdit: { padding: "4px 10px", borderRadius: "6px", border: "none", background: "#eef2ff", color: "#4f46e5", cursor: "pointer", fontSize: "12px", fontWeight: "600", marginRight: "6px" },
    grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginBottom: "14px" },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" },
    table: { width: "100%", borderCollapse: "collapse" },
    th: { textAlign: "left", fontSize: "11px", color: "#aaa", fontWeight: "700", padding: "8px 14px", borderBottom: "2px solid #f0f0f0", textTransform: "uppercase", letterSpacing: "0.5px" },
    td: { padding: "10px 14px", borderBottom: "1px solid #f7f7f7", fontSize: "14px" },
    geoBadge: { display: "inline-block", padding: "3px 10px", borderRadius: "20px", background: "#eef2ff", color: "#4f46e5", fontSize: "12px", fontWeight: "700" },
    callingCodeBadge: { display: "inline-block", padding: "3px 10px", borderRadius: "20px", background: "#dcfce7", color: "#16a34a", fontSize: "12px", fontWeight: "700", fontFamily: "monospace" },
    prefixCode: { background: "#f5f5f5", padding: "2px 8px", borderRadius: "4px", fontFamily: "monospace", fontSize: "13px" },
    msg: (t) => ({ padding: "10px 16px", borderRadius: "8px", marginBottom: "14px", fontSize: "13px", fontWeight: "500", background: t === "success" ? "#dcfce7" : "#fee2e2", color: t === "success" ? "#16a34a" : "#dc2626" }),
    sectionTitle: { fontWeight: "600", marginBottom: "14px", fontSize: "15px", display: "flex", alignItems: "center", gap: "8px" },
  };

  const suggestedCarriers = form.geo ? (CARRIERS_BY_GEO[form.geo] || []) : [];

  return (
    <>
      <Navbar />
      <div style={s.page}>
      <div style={s.title}>📡 Carrier Prefix Manager</div>
      <div style={s.sub}>Countries, calling codes, aur carrier prefixes — sab dashboard se manage karo</div>

      {/* GEOS / CALLING CODES */}
      <div style={s.card}>
        <div style={s.sectionTitle}>
          🌍 Countries &amp; Calling Codes
          <span style={{ color: "#999", fontWeight: "400", fontSize: "13px" }}>({filteredGeos.length} total)</span>
        </div>
        <div style={{ color: "#999", fontSize: "12px", marginBottom: "14px" }}>
          Ye list landing pages ke mobile-number dropdown (jaise +964) me directly use hoti hai — naya country add karo, kahi bhi code edit karne ki zaroorat nahi.
        </div>
        {geoMsg && <div style={s.msg(geoMsg.type)}>{geoMsg.text}</div>}
        <div style={s.grid3}>
          <div>
            <span style={s.label}>Country Code (e.g. EG)</span>
            <input style={s.input} placeholder="EG" value={geoForm.code}
              onChange={e => setGeoForm({ ...geoForm, code: e.target.value.toUpperCase().slice(0, 3) })} />
          </div>
          <div>
            <span style={s.label}>Country Name</span>
            <input style={s.input} placeholder="Egypt" value={geoForm.name}
              onChange={e => setGeoForm({ ...geoForm, name: e.target.value })} />
          </div>
          <div>
            <span style={s.label}>Calling Code (e.g. +20)</span>
            <input style={s.input} placeholder="+20" value={geoForm.calling_code}
              onChange={e => setGeoForm({ ...geoForm, calling_code: e.target.value })} />
          </div>
        </div>
        <button style={s.btn} onClick={addGeo}>+ Add Country</button>

        <div style={{ ...s.grid2, marginTop: "18px", marginBottom: "0" }}>
          <div>
            <span style={s.label}>Filter by Country</span>
            <select style={s.select} value={geoFilterCountry} onChange={e => setGeoFilterCountry(e.target.value)}>
              <option value="">All Countries</option>
              {geos.map(g => <option key={g.code} value={g.code}>{g.code} — {g.name}</option>)}
            </select>
          </div>
          <div>
            <span style={s.label}>Filter by Calling Code</span>
            <input style={s.input} placeholder="Search calling code... e.g. +964" value={geoFilterCallingCode}
              onChange={e => setGeoFilterCallingCode(e.target.value)} />
          </div>
        </div>

        <table style={{ ...s.table, marginTop: "18px" }}>
          <thead>
            <tr>
              <th style={s.th}>Code</th>
              <th style={s.th}>Country</th>
              <th style={s.th}>Calling Code</th>
              <th style={s.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredGeos.map((g, i) => (
              <tr key={g.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={s.td}><span style={s.geoBadge}>{g.code}</span></td>
                <td style={s.td}>
                  {editingGeoId === g.id ? (
                    <input style={{ ...s.input, padding: "5px 8px" }} value={editingGeoDraft.name}
                      onChange={e => setEditingGeoDraft({ ...editingGeoDraft, name: e.target.value })} />
                  ) : <strong>{g.name}</strong>}
                </td>
                <td style={s.td}>
                  {editingGeoId === g.id ? (
                    <input style={{ ...s.input, padding: "5px 8px", width: "100px" }} value={editingGeoDraft.calling_code}
                      onChange={e => setEditingGeoDraft({ ...editingGeoDraft, calling_code: e.target.value })} />
                  ) : (
                    g.calling_code ? <span style={s.callingCodeBadge}>{g.calling_code}</span> : <span style={{ color: "#ccc" }}>—</span>
                  )}
                </td>
                <td style={s.td}>
                  {editingGeoId === g.id ? (
                    <>
                      <button style={s.btnEdit} onClick={() => saveEditGeo(g.id)}>💾 Save</button>
                      <button style={s.btnDel} onClick={() => setEditingGeoId(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button style={s.btnEdit} onClick={() => startEditGeo(g)}>✏️ Edit</button>
                      <button style={s.btnDel} onClick={() => removeGeo(g.id, g.name)}>🗑 Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!filteredGeos.length && (
              <tr><td colSpan={4} style={{ ...s.td, textAlign: "center", color: "#aaa" }}>{geos.length ? "No countries match your filters." : "No countries added yet."}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ADD PREFIX FORM */}
      <div style={s.card}>
        <div style={s.sectionTitle}>➕ Add New Carrier Prefix</div>
        {msg && <div style={s.msg(msg.type)}>{msg.text}</div>}
        <div style={s.grid3}>
          <div>
            <span style={s.label}>Country (GEO)</span>
            <select style={s.select} value={form.geo}
              onChange={e => setForm({ ...form, geo: e.target.value, carrier: "", customGeo: "" })}>
              <option value="">-- Select Country --</option>
              {geos.map(g => (
                <option key={g.code} value={g.code}>{g.code} — {g.name}</option>
              ))}
              <option value="__other__">Other (type below)</option>
            </select>
            {form.geo === "__other__" && (
              <input style={{ ...s.input, marginTop: "6px" }}
                placeholder="Country code type karo e.g. BH, KW, JO"
                value={form.customGeo || ""}
                onChange={e => setForm({ ...form, customGeo: e.target.value.toUpperCase().slice(0,2) })} />
            )}
          </div>
          <div>
            <span style={s.label}>Carrier</span>
            {suggestedCarriers.length > 0 ? (
              <>
                <select style={s.select} value={form.carrier}
                  onChange={e => setForm({ ...form, carrier: e.target.value })}>
                  <option value="">-- Select Carrier --</option>
                  {suggestedCarriers.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__custom__">+ Other (custom)</option>
                </select>
                {form.carrier === "__custom__" && (
                  <input style={{ ...s.input, marginTop: "6px" }}
                    placeholder="Carrier name type karo"
                    value={customCarrier}
                    onChange={e => setCustomCarrier(e.target.value)} />
                )}
              </>
            ) : (
              <input style={s.input} placeholder="e.g. Zain"
                value={form.carrier} onChange={e => setForm({ ...form, carrier: e.target.value })} />
            )}
          </div>
          <div>
            <span style={s.label}>Prefix (digits only)</span>
            <input style={s.input} placeholder="e.g. 97059 or 077"
              value={form.prefix} onChange={e => setForm({ ...form, prefix: e.target.value })} />
          </div>
        </div>
        <button style={s.btn} onClick={add}>+ Add Prefix</button>
      </div>

      {/* FILTER + TABLE */}
      <div style={s.card}>
        <div style={s.sectionTitle}>
          📋 All Prefixes
          <span style={{ color: "#999", fontWeight: "400", fontSize: "13px" }}>({rows.length} total)</span>
        </div>
        <div style={s.grid2}>
          <div>
            <span style={s.label}>Filter by Country</span>
            <select style={s.select} value={filterGeo} onChange={e => setFilterGeo(e.target.value)}>
              <option value="">All Countries</option>
              {geos.map(g => <option key={g.code} value={g.code}>{g.code} — {g.name}</option>)}
            </select>
          </div>
          <div>
            <span style={s.label}>Filter by Carrier</span>
            <input style={s.input} placeholder="Search carrier..." value={filterCarrier}
              onChange={e => setFilterCarrier(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "#aaa", padding: "32px" }}>Loading...</div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: "center", color: "#aaa", padding: "32px" }}>No prefixes found</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>GEO</th>
                <th style={s.th}>Country</th>
                <th style={s.th}>Carrier</th>
                <th style={s.th}>Prefix</th>
                <th style={s.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={s.td}><span style={s.geoBadge}>{r.geo}</span></td>
                  <td style={{ ...s.td, color: "#666", fontSize: "13px" }}>{GEO_NAMES[r.geo] || r.geo}</td>
                  <td style={s.td}><strong>{r.carrier}</strong></td>
                  <td style={s.td}><span style={s.prefixCode}>{r.prefix}</span></td>
                  <td style={s.td}>
                    <button style={s.btnDel} onClick={() => remove(r.id, r.carrier, r.geo)}>🗑 Delete</button>
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
