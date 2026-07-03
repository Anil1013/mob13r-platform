import { useEffect, useState } from "react";

const API_BASE = "https://backend.mob13r.com";

const COMMON_CARRIERS = {
  PS: ["Jawwal", "Ooredoo"],
  IQ: ["Zain", "Asiacell", "Korek", "Umniah"],
  KW: ["Zain", "Ooredoo", "STC"],
  JO: ["Zain", "Orange", "Umniah"],
  SA: ["STC", "Mobily", "Zain"],
  AE: ["Etisalat", "Du"],
  EG: ["Vodafone", "Orange", "Etisalat", "WE"],
  BH: ["Zain", "Batelco", "STC"],
  OM: ["Ooredoo", "Omantel", "Vodafone"],
  QA: ["Ooredoo", "Vodafone"],
  YE: ["Yemen Mobile", "MTN", "Sabafon"],
  LB: ["Touch", "Alfa"],
  SY: ["Syriatel", "MTN"],
};

const ALL_GEOS = [
  "AE","BH","EG","IQ","JO","KW","LB","OM","PS","QA","SA","SY","YE",
  "IN","PK","BD","LK","NP","MM","TH","ID","MY","PH","VN",
];

export default function CarrierPrefixes() {
  const [rows, setRows] = useState([]);
  const [filterGeo, setFilterGeo] = useState("");
  const [filterCarrier, setFilterCarrier] = useState("");
  const [form, setForm] = useState({ carrier: "", geo: "", prefix: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterGeo) params.set("geo", filterGeo);
    if (filterCarrier) params.set("carrier", filterCarrier);
    const res = await fetch(`${API_BASE}/api/carrier-prefixes?${params}`, { headers });
    const data = await res.json();
    setRows(data.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterGeo, filterCarrier]);

  const add = async () => {
    if (!form.carrier || !form.geo || !form.prefix) {
      setMsg({ type: "error", text: "Sab fields required hain" });
      return;
    }
    const res = await fetch(`${API_BASE}/api/carrier-prefixes`, {
      method: "POST", headers,
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.status === "SUCCESS") {
      setMsg({ type: "success", text: "✅ Prefix add ho gaya!" });
      setForm({ carrier: "", geo: "", prefix: "" });
      load();
    } else {
      setMsg({ type: "error", text: data.error || "Failed" });
    }
    setTimeout(() => setMsg(null), 3000);
  };

  const remove = async (id) => {
    if (!confirm("Delete karna hai?")) return;
    await fetch(`${API_BASE}/api/carrier-prefixes/${id}`, { method: "DELETE", headers });
    load();
  };

  const s = {
    page: { padding: "24px", fontFamily: "sans-serif", background: "#f8f9fa", minHeight: "100vh" },
    title: { fontSize: "22px", fontWeight: "700", marginBottom: "4px", color: "#1a1a2e" },
    sub: { color: "#888", fontSize: "13px", marginBottom: "24px" },
    card: { background: "#fff", borderRadius: "12px", padding: "20px", marginBottom: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
    label: { fontSize: "12px", color: "#666", marginBottom: "4px", display: "block" },
    input: { width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", boxSizing: "border-box" },
    select: { width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", background: "#fff", boxSizing: "border-box" },
    btn: { padding: "10px 20px", borderRadius: "8px", border: "none", background: "#e94560", color: "#fff", fontWeight: "600", cursor: "pointer", fontSize: "14px" },
    btnSm: { padding: "5px 12px", borderRadius: "6px", border: "none", background: "#fee2e2", color: "#dc2626", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
    grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" },
    table: { width: "100%", borderCollapse: "collapse" },
    th: { textAlign: "left", fontSize: "11px", color: "#888", fontWeight: "600", padding: "8px 12px", borderBottom: "2px solid #f0f0f0", textTransform: "uppercase" },
    td: { padding: "10px 12px", borderBottom: "1px solid #f5f5f5", fontSize: "14px" },
    badge: { display: "inline-block", padding: "2px 8px", borderRadius: "20px", background: "#e8f4fd", color: "#0066cc", fontSize: "12px", fontWeight: "600" },
    msg: (t) => ({ padding: "10px 16px", borderRadius: "8px", marginBottom: "12px", fontSize: "13px", background: t === "success" ? "#dcfce7" : "#fee2e2", color: t === "success" ? "#16a34a" : "#dc2626" }),
  };

  const suggestedCarriers = form.geo ? (COMMON_CARRIERS[form.geo] || []) : [];

  return (
    <div style={s.page}>
      <div style={s.title}>📡 Carrier Prefix Manager</div>
      <div style={s.sub}>Manage carrier number prefixes for MSISDN validation</div>

      {/* ADD FORM */}
      <div style={s.card}>
        <div style={{ fontWeight: "600", marginBottom: "14px", fontSize: "15px" }}>Add New Prefix</div>
        {msg && <div style={s.msg(msg.type)}>{msg.text}</div>}
        <div style={s.grid3}>
          <div>
            <span style={s.label}>Country (GEO)</span>
            <select style={s.select} value={form.geo} onChange={e => setForm({ ...form, geo: e.target.value, carrier: "" })}>
              <option value="">Select GEO</option>
              {ALL_GEOS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <span style={s.label}>Carrier</span>
            {suggestedCarriers.length > 0 ? (
              <select style={s.select} value={form.carrier} onChange={e => setForm({ ...form, carrier: e.target.value })}>
                <option value="">Select Carrier</option>
                {suggestedCarriers.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="__custom__">Other (type below)</option>
              </select>
            ) : (
              <input style={s.input} placeholder="e.g. Zain" value={form.carrier}
                onChange={e => setForm({ ...form, carrier: e.target.value })} />
            )}
            {form.carrier === "__custom__" && (
              <input style={{ ...s.input, marginTop: "6px" }} placeholder="Type carrier name"
                onChange={e => setForm({ ...form, carrier: e.target.value })} />
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
        <div style={{ fontWeight: "600", marginBottom: "14px", fontSize: "15px" }}>
          All Prefixes <span style={{ color: "#888", fontWeight: "400" }}>({rows.length})</span>
        </div>
        <div style={s.grid2}>
          <div>
            <span style={s.label}>Filter by GEO</span>
            <select style={s.select} value={filterGeo} onChange={e => setFilterGeo(e.target.value)}>
              <option value="">All Countries</option>
              {ALL_GEOS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <span style={s.label}>Filter by Carrier</span>
            <input style={s.input} placeholder="Search carrier..." value={filterCarrier}
              onChange={e => setFilterCarrier(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "#888", padding: "24px" }}>Loading...</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Carrier</th>
                <th style={s.th}>GEO</th>
                <th style={s.th}>Prefix</th>
                <th style={s.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={4} style={{ ...s.td, textAlign: "center", color: "#aaa" }}>No prefixes found</td></tr>
              ) : rows.map(r => (
                <tr key={r.id}>
                  <td style={s.td}><strong>{r.carrier}</strong></td>
                  <td style={s.td}><span style={s.badge}>{r.geo}</span></td>
                  <td style={s.td}><code style={{ background: "#f5f5f5", padding: "2px 8px", borderRadius: "4px" }}>{r.prefix}</code></td>
                  <td style={s.td}>
                    <button style={s.btnSm} onClick={() => remove(r.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
