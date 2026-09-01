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
    page: { padding: "32px 28px", fontFamily: "'Lora',serif", background: "linear-gradient(180deg,#fdf8fb 0%,#fbf3f7 100%)", minHeight: "100vh", maxWidth: 1440, margin: "0 auto" },
    title: { fontSize: 26, fontWeight: 800, marginBottom: 4, color: "#2d1b30", letterSpacing: "-0.01em" },
    sub: { color: "#a888b3", fontSize: 13, marginBottom: 22 },
    card: { background: "#fff", border: "1px solid #f0e5ec", borderRadius: 18, padding: 24, marginBottom: 20, boxShadow: "0 8px 30px rgba(124,58,237,0.09), 0 2px 6px rgba(0,0,0,0.03)" },
    label: { fontSize: 11, color: "#8b6a9a", marginBottom: 5, display: "block", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" },
    input: { width: "100%", padding: "10px 13px", borderRadius: 11, border: "1.5px solid #ecdde6", fontSize: 13.5, boxSizing: "border-box", outline: "none", fontFamily: "'Lora',serif", background: "#fff", color: "#3d2436" },
    select: { width: "100%", padding: "10px 13px", borderRadius: 11, border: "1.5px solid #ecdde6", fontSize: 13.5, background: "#fff", boxSizing: "border-box", fontFamily: "'Lora',serif", color: "#3d2436", cursor: "pointer" },
    btn: { padding: "11px 22px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#7c3aed,#d4709a)", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13.5, fontFamily: "'Lora',serif", boxShadow: "0 4px 14px rgba(124,58,237,0.28)" },
    btnDel: { padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(220,90,90,0.22)", background: "rgba(220,90,90,0.06)", color: "#dc5a5a", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'Lora',serif" },
    btnEdit: { padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(124,58,237,0.2)", background: "rgba(124,58,237,0.06)", color: "#7c3aed", cursor: "pointer", fontSize: 12, fontWeight: 600, marginRight: 6, fontFamily: "'Lora',serif" },
    grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 },
    table: { width: "100%", borderCollapse: "separate", borderSpacing: 0 },
    th: { textAlign: "left", fontSize: 11, color: "#8b6a9a", fontWeight: 700, padding: "12px 16px", borderBottom: "1.5px solid #eee0ea", textTransform: "uppercase", letterSpacing: "0.06em", background: "#faf6fb" },
    td: { padding: "11px 16px", borderBottom: "1px solid #f4ecf1", fontSize: 13.5, color: "#3d2436" },
    box: { display: "inline-block", padding: "3px 12px", borderRadius: 8, background: "#f8fafc", color: "#334155", fontSize: 12, fontWeight: 600, fontFamily: "'Lora',serif", border: "1px solid #e2e8f0" },
    prefixBox: { background: "#f8fafc", padding: "3px 10px", borderRadius: 8, fontFamily: "'Lora',serif", fontSize: 13, border: "1px solid #e2e8f0", color: "#334155" },
    msg: (t) => ({ padding: "11px 16px", borderRadius: 12, marginBottom: 14, fontSize: 13, fontWeight: 500, fontFamily: "'Lora',serif", background: t === "success" ? "#ecfdf5" : "#fef2f2", color: t === "success" ? "#16a34a" : "#dc2626", border: `1px solid ${t === "success" ? "#bbf7d0" : "#fecaca"}` }),
    sectionTitle: { fontWeight: 700, marginBottom: 14, fontSize: 15.5, display: "flex", alignItems: "center", gap: 8, color: "#2d1b30", fontFamily: "'Lora',serif" },
  };

  const suggestedCarriers = form.geo ? (CARRIERS_BY_GEO[form.geo] || []) : [];

  return (
    <>
      <Navbar />
      <div style={s.page} className="m13-fade-in">
      <div style={s.title}>📡 Carrier Prefix Manager</div>
      <div style={s.sub}>Countries, calling codes, aur carrier prefixes — sab dashboard se manage karo</div>

      {/* GEOS / CALLING CODES */}
      <div style={s.card}>
        <div style={s.sectionTitle}>
          🌍 Countries &amp; Calling Codes
          <span style={{ color: "#a888b3", fontWeight: 400, fontSize: 13 }}>({filteredGeos.length} total)</span>
        </div>
        <div style={{ color: "#a888b3", fontSize: 12, marginBottom: 14 }}>
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
        <button className="m13-btn" style={s.btn} onClick={addGeo}>+ Add Country</button>

        <div style={{ ...s.grid2, marginTop: 18, marginBottom: 0 }}>
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

        <div style={{ overflow: "hidden", borderRadius: 14, border: "1px solid #f0e5ec", marginTop: 18 }}>
        <table style={s.table}>
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
              <tr key={g.id} className="m13-row-hover" style={{ background: i % 2 === 0 ? "#fff" : "#fdfafc" }}>
                <td style={s.td}><span style={s.box}>{g.code}</span></td>
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
                    g.calling_code ? <span style={s.box}>{g.calling_code}</span> : <span style={{ color: "#cbd5e1" }}>—</span>
                  )}
                </td>
                <td style={s.td}>
                  {editingGeoId === g.id ? (
                    <>
                      <button className="m13-btn" style={s.btnEdit} onClick={() => saveEditGeo(g.id)}>💾 Save</button>
                      <button className="m13-btn" style={s.btnDel} onClick={() => setEditingGeoId(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="m13-btn" style={s.btnEdit} onClick={() => startEditGeo(g)}>✏️ Edit</button>
                      <button className="m13-btn" style={s.btnDel} onClick={() => removeGeo(g.id, g.name)}>🗑 Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!filteredGeos.length && (
              <tr><td colSpan={4} style={{ ...s.td, textAlign: "center", color: "#a888b3", padding: 30 }}>{geos.length ? "No countries match your filters." : "No countries added yet."}</td></tr>
            )}
          </tbody>
        </table>
        </div>
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
              <input style={{ ...s.input, marginTop: 6 }}
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
                  <input style={{ ...s.input, marginTop: 6 }}
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
        <button className="m13-btn" style={s.btn} onClick={add}>+ Add Prefix</button>
      </div>

      {/* FILTER + TABLE */}
      <div style={s.card}>
        <div style={s.sectionTitle}>
          📋 All Prefixes
          <span style={{ color: "#a888b3", fontWeight: 400, fontSize: 13 }}>({rows.length} total)</span>
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
          <div style={{ textAlign: "center", padding: 40 }}>
            <span className="m13-spinner" />
            <div style={{ marginTop: 10, color: "#a888b3", fontSize: 13 }}>Loading...</div>
          </div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 28, opacity: 0.5, marginBottom: 6 }}>📡</div>
            <div style={{ color: "#a888b3", fontSize: 13 }}>No prefixes found</div>
          </div>
        ) : (
          <div style={{ overflow: "hidden", borderRadius: 14, border: "1px solid #f0e5ec" }}>
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
                <tr key={r.id} className="m13-row-hover" style={{ background: i % 2 === 0 ? "#fff" : "#fdfafc" }}>
                  <td style={s.td}><span style={s.box}>{r.geo}</span></td>
                  <td style={{ ...s.td, color: "#8b6a9a", fontSize: 13 }}>{GEO_NAMES[r.geo] || r.geo}</td>
                  <td style={s.td}><strong>{r.carrier}</strong></td>
                  <td style={s.td}><span style={s.prefixBox}>{r.prefix}</span></td>
                  <td style={s.td}>
                    <button className="m13-btn" style={s.btnDel} onClick={() => remove(r.id, r.carrier, r.geo)}>🗑 Delete</button>
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
