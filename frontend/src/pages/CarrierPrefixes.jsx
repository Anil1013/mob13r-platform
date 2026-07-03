import { useEffect, useState } from "react";

const API_BASE = "https://backend.mob13r.com";

const CARRIERS_BY_GEO = {
  AE: ["Etisalat", "Du"],
  AF: ["Roshan", "MTN", "Etisalat", "AWCC"],
  BH: ["Zain", "Batelco", "STC"],
  BD: ["Grameenphone", "Banglalink", "Robi", "Airtel", "Teletalk"],
  DZ: ["Mobilis", "Ooredoo", "Djezzy"],
  EG: ["Vodafone", "Orange", "Etisalat", "WE"],
  IQ: ["Zain", "Asiacell", "Korek", "Umniah"],
  IN: ["Jio", "Airtel", "Vi", "BSNL"],
  ID: ["Telkomsel", "Indosat", "XL", "Tri"],
  IR: ["MCI", "Irancell", "RighTel"],
  JO: ["Zain", "Orange", "Umniah"],
  KW: ["Zain", "Ooredoo", "STC"],
  KZ: ["Kcell", "Beeline", "Tele2"],
  LB: ["Touch", "Alfa"],
  LY: ["Libyana", "Madar"],
  MA: ["Maroc Telecom", "Orange", "Inwi"],
  MM: ["MPT", "Telenor", "Ooredoo", "Mytel"],
  MY: ["Maxis", "Celcom", "Digi", "U Mobile"],
  NG: ["MTN", "Glo", "Airtel", "9mobile"],
  OM: ["Ooredoo", "Omantel", "Vodafone"],
  PK: ["Jazz", "Telenor", "Zong", "Ufone"],
  PS: ["Jawwal", "Ooredoo"],
  PH: ["Globe", "Smart", "DITO"],
  QA: ["Ooredoo", "Vodafone"],
  SA: ["STC", "Mobily", "Zain"],
  SD: ["Zain", "MTN", "Sudani"],
  SY: ["Syriatel", "MTN"],
  TH: ["AIS", "DTAC", "True Move"],
  TN: ["Ooredoo", "Orange", "Tunisie Telecom"],
  TR: ["Turkcell", "Vodafone", "Turk Telekom"],
  TZ: ["Vodacom", "Airtel", "Tigo", "Halotel"],
  UZ: ["Ucell", "Beeline", "MobiUz"],
  VN: ["Viettel", "Vinaphone", "Mobifone"],
  YE: ["Yemen Mobile", "MTN", "Sabafon"],
  ZA: ["Vodacom", "MTN", "Cell C", "Telkom"],
};

// Complete world country list
const ALL_COUNTRIES = [
  {code:"AF",name:"Afghanistan"},{code:"AL",name:"Albania"},{code:"DZ",name:"Algeria"},
  {code:"AD",name:"Andorra"},{code:"AO",name:"Angola"},{code:"AG",name:"Antigua & Barbuda"},
  {code:"AR",name:"Argentina"},{code:"AM",name:"Armenia"},{code:"AU",name:"Australia"},
  {code:"AT",name:"Austria"},{code:"AZ",name:"Azerbaijan"},{code:"BS",name:"Bahamas"},
  {code:"BH",name:"Bahrain"},{code:"BD",name:"Bangladesh"},{code:"BB",name:"Barbados"},
  {code:"BY",name:"Belarus"},{code:"BE",name:"Belgium"},{code:"BZ",name:"Belize"},
  {code:"BJ",name:"Benin"},{code:"BT",name:"Bhutan"},{code:"BO",name:"Bolivia"},
  {code:"BA",name:"Bosnia & Herzegovina"},{code:"BW",name:"Botswana"},{code:"BR",name:"Brazil"},
  {code:"BN",name:"Brunei"},{code:"BG",name:"Bulgaria"},{code:"BF",name:"Burkina Faso"},
  {code:"BI",name:"Burundi"},{code:"CV",name:"Cabo Verde"},{code:"KH",name:"Cambodia"},
  {code:"CM",name:"Cameroon"},{code:"CA",name:"Canada"},{code:"CF",name:"Central African Rep."},
  {code:"TD",name:"Chad"},{code:"CL",name:"Chile"},{code:"CN",name:"China"},
  {code:"CO",name:"Colombia"},{code:"KM",name:"Comoros"},{code:"CG",name:"Congo"},
  {code:"CD",name:"Congo (DRC)"},{code:"CR",name:"Costa Rica"},{code:"CI",name:"Côte d'Ivoire"},
  {code:"HR",name:"Croatia"},{code:"CU",name:"Cuba"},{code:"CY",name:"Cyprus"},
  {code:"CZ",name:"Czech Republic"},{code:"DK",name:"Denmark"},{code:"DJ",name:"Djibouti"},
  {code:"DO",name:"Dominican Republic"},{code:"EC",name:"Ecuador"},{code:"EG",name:"Egypt"},
  {code:"SV",name:"El Salvador"},{code:"GQ",name:"Equatorial Guinea"},{code:"ER",name:"Eritrea"},
  {code:"EE",name:"Estonia"},{code:"SZ",name:"Eswatini"},{code:"ET",name:"Ethiopia"},
  {code:"FJ",name:"Fiji"},{code:"FI",name:"Finland"},{code:"FR",name:"France"},
  {code:"GA",name:"Gabon"},{code:"GM",name:"Gambia"},{code:"GE",name:"Georgia"},
  {code:"DE",name:"Germany"},{code:"GH",name:"Ghana"},{code:"GR",name:"Greece"},
  {code:"GT",name:"Guatemala"},{code:"GN",name:"Guinea"},{code:"GW",name:"Guinea-Bissau"},
  {code:"GY",name:"Guyana"},{code:"HT",name:"Haiti"},{code:"HN",name:"Honduras"},
  {code:"HU",name:"Hungary"},{code:"IS",name:"Iceland"},{code:"IN",name:"India"},
  {code:"ID",name:"Indonesia"},{code:"IR",name:"Iran"},{code:"IQ",name:"Iraq"},
  {code:"IE",name:"Ireland"},{code:"IL",name:"Israel"},{code:"IT",name:"Italy"},
  {code:"JM",name:"Jamaica"},{code:"JP",name:"Japan"},{code:"JO",name:"Jordan"},
  {code:"KZ",name:"Kazakhstan"},{code:"KE",name:"Kenya"},{code:"KI",name:"Kiribati"},
  {code:"KW",name:"Kuwait"},{code:"KG",name:"Kyrgyzstan"},{code:"LA",name:"Laos"},
  {code:"LV",name:"Latvia"},{code:"LB",name:"Lebanon"},{code:"LS",name:"Lesotho"},
  {code:"LR",name:"Liberia"},{code:"LY",name:"Libya"},{code:"LI",name:"Liechtenstein"},
  {code:"LT",name:"Lithuania"},{code:"LU",name:"Luxembourg"},{code:"MG",name:"Madagascar"},
  {code:"MW",name:"Malawi"},{code:"MY",name:"Malaysia"},{code:"MV",name:"Maldives"},
  {code:"ML",name:"Mali"},{code:"MT",name:"Malta"},{code:"MH",name:"Marshall Islands"},
  {code:"MR",name:"Mauritania"},{code:"MU",name:"Mauritius"},{code:"MX",name:"Mexico"},
  {code:"FM",name:"Micronesia"},{code:"MD",name:"Moldova"},{code:"MC",name:"Monaco"},
  {code:"MN",name:"Mongolia"},{code:"ME",name:"Montenegro"},{code:"MA",name:"Morocco"},
  {code:"MZ",name:"Mozambique"},{code:"MM",name:"Myanmar"},{code:"NA",name:"Namibia"},
  {code:"NR",name:"Nauru"},{code:"NP",name:"Nepal"},{code:"NL",name:"Netherlands"},
  {code:"NZ",name:"New Zealand"},{code:"NI",name:"Nicaragua"},{code:"NE",name:"Niger"},
  {code:"NG",name:"Nigeria"},{code:"NO",name:"Norway"},{code:"OM",name:"Oman"},
  {code:"PK",name:"Pakistan"},{code:"PW",name:"Palau"},{code:"PS",name:"Palestine"},
  {code:"PA",name:"Panama"},{code:"PG",name:"Papua New Guinea"},{code:"PY",name:"Paraguay"},
  {code:"PE",name:"Peru"},{code:"PH",name:"Philippines"},{code:"PL",name:"Poland"},
  {code:"PT",name:"Portugal"},{code:"QA",name:"Qatar"},{code:"RO",name:"Romania"},
  {code:"RU",name:"Russia"},{code:"RW",name:"Rwanda"},{code:"KN",name:"Saint Kitts & Nevis"},
  {code:"LC",name:"Saint Lucia"},{code:"VC",name:"Saint Vincent & Grenadines"},
  {code:"WS",name:"Samoa"},{code:"SM",name:"San Marino"},{code:"ST",name:"São Tomé & Príncipe"},
  {code:"SA",name:"Saudi Arabia"},{code:"SN",name:"Senegal"},{code:"RS",name:"Serbia"},
  {code:"SC",name:"Seychelles"},{code:"SL",name:"Sierra Leone"},{code:"SG",name:"Singapore"},
  {code:"SK",name:"Slovakia"},{code:"SI",name:"Slovenia"},{code:"SB",name:"Solomon Islands"},
  {code:"SO",name:"Somalia"},{code:"ZA",name:"South Africa"},{code:"SS",name:"South Sudan"},
  {code:"ES",name:"Spain"},{code:"LK",name:"Sri Lanka"},{code:"SD",name:"Sudan"},
  {code:"SR",name:"Suriname"},{code:"SE",name:"Sweden"},{code:"CH",name:"Switzerland"},
  {code:"SY",name:"Syria"},{code:"TW",name:"Taiwan"},{code:"TJ",name:"Tajikistan"},
  {code:"TZ",name:"Tanzania"},{code:"TH",name:"Thailand"},{code:"TL",name:"Timor-Leste"},
  {code:"TG",name:"Togo"},{code:"TO",name:"Tonga"},{code:"TT",name:"Trinidad & Tobago"},
  {code:"TN",name:"Tunisia"},{code:"TR",name:"Turkey"},{code:"TM",name:"Turkmenistan"},
  {code:"TV",name:"Tuvalu"},{code:"UG",name:"Uganda"},{code:"UA",name:"Ukraine"},
  {code:"AE",name:"UAE"},{code:"GB",name:"United Kingdom"},{code:"US",name:"United States"},
  {code:"UY",name:"Uruguay"},{code:"UZ",name:"Uzbekistan"},{code:"VU",name:"Vanuatu"},
  {code:"VE",name:"Venezuela"},{code:"VN",name:"Vietnam"},{code:"YE",name:"Yemen"},
  {code:"ZM",name:"Zambia"},{code:"ZW",name:"Zimbabwe"}
].sort((a,b) => a.name.localeCompare(b.name));

const ALL_GEOS = ALL_COUNTRIES.map(c => c.code);

const GEO_NAMES = Object.fromEntries(ALL_COUNTRIES.map(c => [c.code, c.name]));

export default function CarrierPrefixes() {
  const [rows, setRows] = useState([]);
  const [filterGeo, setFilterGeo] = useState("");
  const [filterCarrier, setFilterCarrier] = useState("");
  const [form, setForm] = useState({ carrier: "", geo: "", prefix: "" });
  const [customCarrier, setCustomCarrier] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

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

  useEffect(() => { load(); }, [filterGeo, filterCarrier]);

  const finalCarrier = form.carrier === "__custom__" ? customCarrier : form.carrier;

  const add = async () => {
    if (!finalCarrier || !form.geo || !form.prefix) {
      setMsg({ type: "error", text: "Sab fields required hain" });
      setTimeout(() => setMsg(null), 3000);
      return;
    }
    const res = await fetch(`${API_BASE}/api/carrier-prefixes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carrier: finalCarrier, geo: form.geo, prefix: form.prefix }),
    });
    const data = await res.json();
    if (data.status === "SUCCESS") {
      setMsg({ type: "success", text: `✅ ${finalCarrier} (${form.geo}) - ${form.prefix} add ho gaya!` });
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
    await fetch(`${API_BASE}/api/carrier-prefixes/${id}`, { method: "DELETE" });
    load();
  };

  const s = {
    page: { padding: "24px", fontFamily: "'Inter', sans-serif", background: "#f5f6fa", minHeight: "100vh" },
    title: { fontSize: "22px", fontWeight: "700", marginBottom: "2px", color: "#1a1a2e" },
    sub: { color: "#999", fontSize: "13px", marginBottom: "24px" },
    card: { background: "#fff", borderRadius: "12px", padding: "20px", marginBottom: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" },
    label: { fontSize: "11px", color: "#666", marginBottom: "5px", display: "block", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" },
    input: { width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #e0e0e0", fontSize: "14px", boxSizing: "border-box", outline: "none" },
    select: { width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #e0e0e0", fontSize: "14px", background: "#fff", boxSizing: "border-box" },
    btn: { padding: "10px 22px", borderRadius: "8px", border: "none", background: "#e94560", color: "#fff", fontWeight: "600", cursor: "pointer", fontSize: "14px" },
    btnDel: { padding: "4px 10px", borderRadius: "6px", border: "none", background: "#fff0f0", color: "#dc2626", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
    grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginBottom: "14px" },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" },
    table: { width: "100%", borderCollapse: "collapse" },
    th: { textAlign: "left", fontSize: "11px", color: "#aaa", fontWeight: "700", padding: "8px 14px", borderBottom: "2px solid #f0f0f0", textTransform: "uppercase", letterSpacing: "0.5px" },
    td: { padding: "10px 14px", borderBottom: "1px solid #f7f7f7", fontSize: "14px" },
    geoBadge: { display: "inline-block", padding: "3px 10px", borderRadius: "20px", background: "#eef2ff", color: "#4f46e5", fontSize: "12px", fontWeight: "700" },
    prefixCode: { background: "#f5f5f5", padding: "2px 8px", borderRadius: "4px", fontFamily: "monospace", fontSize: "13px" },
    msg: (t) => ({ padding: "10px 16px", borderRadius: "8px", marginBottom: "14px", fontSize: "13px", fontWeight: "500", background: t === "success" ? "#dcfce7" : "#fee2e2", color: t === "success" ? "#16a34a" : "#dc2626" }),
    sectionTitle: { fontWeight: "600", marginBottom: "14px", fontSize: "15px", display: "flex", alignItems: "center", gap: "8px" },
  };

  const suggestedCarriers = form.geo ? (CARRIERS_BY_GEO[form.geo] || []) : [];

  // Group rows by GEO for display
  const grouped = rows.reduce((acc, r) => {
    if (!acc[r.geo]) acc[r.geo] = [];
    acc[r.geo].push(r);
    return acc;
  }, {});

  return (
    <div style={s.page}>
      <div style={s.title}>📡 Carrier Prefix Manager</div>
      <div style={s.sub}>MSISDN validation ke liye carrier prefixes manage karo</div>

      {/* ADD FORM */}
      <div style={s.card}>
        <div style={s.sectionTitle}>➕ Add New Prefix</div>
        {msg && <div style={s.msg(msg.type)}>{msg.text}</div>}
        <div style={s.grid3}>
          <div>
            <span style={s.label}>Country (GEO)</span>
            <select style={s.select} value={form.geo}
              onChange={e => setForm({ ...form, geo: e.target.value, carrier: "" })}>
              <option value="">-- Select Country --</option>
              {ALL_GEOS.map(g => (
                <option key={g} value={g}>{g} — {GEO_NAMES[g] || g}</option>
              ))}
            </select>
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
              {ALL_GEOS.map(g => <option key={g} value={g}>{g} — {GEO_NAMES[g] || g}</option>)}
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
                  <td style={s.td} style={{ ...s.td, color: "#666", fontSize: "13px" }}>{GEO_NAMES[r.geo] || r.geo}</td>
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
  );
}
