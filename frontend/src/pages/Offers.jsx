import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

const API_BASE = "https://backend.mob13r.com";

export default function Offers() {
  const token = localStorage.getItem("token");

  /* ---------------- STATE ---------------- */
  const [advertisers, setAdvertisers] = useState([]);
  const [offers, setOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [parameters, setParameters] = useState([]);

  const [offerForm, setOfferForm] = useState({
    advertiser_id: "",
    service_name: "",
    cpa: "",
    daily_cap: "",
    geo: "",
    carrier: "",
    service_type: "NORMAL",
  });

  const [paramForm, setParamForm] = useState({
    param_key: "",
    param_value: "",
  });

  /* ---------------- HEADERS ---------------- */
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  /* ---------------- FETCH ---------------- */
  const fetchAdvertisers = async () => {
    const res = await fetch(`${API_BASE}/api/advertisers`, { headers: authHeaders });
    setAdvertisers(await res.json());
  };

  const fetchOffers = async (advertiserId = "") => {
    const url = advertiserId ? `${API_BASE}/api/offers?advertiser_id=${advertiserId}` : `${API_BASE}/api/offers`;
    const res = await fetch(url, { headers: authHeaders });
    const data = await res.json();
    setOffers(Array.isArray(data) ? data : []);
  };

  const fetchParameters = async (offerId) => {
    const res = await fetch(`${API_BASE}/api/offers/${offerId}/parameters`, { headers: authHeaders });
    setParameters(await res.json());
  };

  useEffect(() => {
    fetchAdvertisers();
    fetchOffers();
  }, []);

  /* ---------------- UPDATE LOGIC ---------------- */
  const updateOffer = async (offerId, payload) => {
    await fetch(`${API_BASE}/api/offers/${offerId}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    fetchOffers(offerForm.advertiser_id);
  };

  const createOffer = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/api/offers`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(offerForm),
    });
    const data = await res.json();
    setOffers((prev) => [...prev, data]);
    setOfferForm({ ...offerForm, service_name: "", cpa: "", daily_cap: "", geo: "", carrier: "" });
  };

  const addParameter = async (e) => {
    e.preventDefault();
    await fetch(`${API_BASE}/api/offers/${selectedOffer.id}/parameters`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(paramForm),
    });
    setParamForm({ param_key: "", param_value: "" });
    fetchParameters(selectedOffer.id);
  };

  const deleteParameter = async (id) => {
    if(window.confirm("Remove param?")) {
      await fetch(`${API_BASE}/api/offers/parameters/${id}`, { method: "DELETE", headers: authHeaders });
      fetchParameters(selectedOffer.id);
    }
  };

  const changeServiceType = async (offerId, service_type) => {
    await fetch(`${API_BASE}/api/offers/${offerId}/service-type`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ service_type }),
    });
    fetchOffers(offerForm.advertiser_id);
  };

  /* ---------------- HELPERS ---------------- */
  const remaining = (o) => !o.daily_cap ? "∞" : Math.max(o.daily_cap - o.today_hits, 0);
  const autoRevenue = (o) => o.cpa ? `$${(Number(o.cpa) * Number(o.today_hits || 0)).toFixed(2)}` : "$0.00";

  const routeBadge = (o) => {
    if (o.daily_cap && o.today_hits >= o.daily_cap) return <span style={styles.badgeCap}>🔴 Cap Full</span>;
    return o.service_type === "NORMAL" ? <span style={styles.badgePrimary}>🟢 Primary</span> : <span style={styles.badgeFallback}>🟡 Fallback</span>;
  };

  return (
    <>
      <Navbar />
      <div style={styles.page}>
        <h1 style={styles.heading}>Universal Offer Engine</h1>

        {/* CREATE BAR */}
        <form onSubmit={createOffer} style={styles.glassBar}>
          <select value={offerForm.advertiser_id} onChange={(e) => { setOfferForm({ ...offerForm, advertiser_id: e.target.value }); fetchOffers(e.target.value); }} style={styles.select}>
            <option value="">All Advertisers</option>
            {advertisers.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input placeholder="Service" required value={offerForm.service_name} onChange={(e) => setOfferForm({ ...offerForm, service_name: e.target.value })} style={styles.input} />
          <input placeholder="CPA" value={offerForm.cpa} onChange={(e) => setOfferForm({ ...offerForm, cpa: e.target.value })} style={styles.inputSmall} />
          <input placeholder="Geo" value={offerForm.geo} onChange={(e) => setOfferForm({ ...offerForm, geo: e.target.value })} style={styles.inputSmall} />
          <input placeholder="Carrier" value={offerForm.carrier} onChange={(e) => setOfferForm({ ...offerForm, carrier: e.target.value })} style={styles.inputSmall} />
          <button type="submit" style={styles.btnCreate}>Create</button>
        </form>

        {/* MAIN TABLE */}
        <div style={styles.tableWrap}>
          <table style={styles.glassTable}>
            <thead>
              <tr style={styles.thRow}>
                <th>ID</th><th>Advertiser</th><th>Service</th><th>CPA</th><th>Geo</th><th>Carrier</th><th>Cap</th><th>Used</th><th>Remain</th><th>Revenue</th><th>Route</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {offers.map(o => (
                <tr key={o.id} style={styles.tr}>
                  <td>{o.id}</td>
                  <td style={{fontWeight:'bold'}}>{o.advertiser_name || "-"}</td>
                  <td>{o.service_name}</td>
                  <td style={{color:'#22c55e'}}>${o.cpa}</td>
                  <td>{o.geo}</td>
                  <td>{o.carrier}</td>
                  <td>{o.daily_cap || '∞'}</td>
                  <td>{o.today_hits}</td>
                  <td style={{color:'#ef4444'}}>{remaining(o)}</td>
                  <td>{autoRevenue(o)}</td>
                  <td>{routeBadge(o)}</td>
                  <td>
                    <div style={{display:'flex', gap:5, justifyContent:'center'}}>
                      <button style={styles.btnAction} onClick={() => changeServiceType(o.id, o.service_type === 'NORMAL' ? 'FALLBACK' : 'NORMAL')}>
                        {o.service_type === 'NORMAL' ? 'To FB' : 'To PR'}
                      </button>
                      <button style={styles.btnManage} onClick={() => { setSelectedOffer(o); fetchParameters(o.id); }}>Manage</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CONFIGURATION PANEL */}
        {selectedOffer && (
          <div style={styles.glassCard}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                <h2>Configuring: {selectedOffer.advertiser_name} - {selectedOffer.service_name}</h2>
                <button onClick={() => setSelectedOffer(null)} style={styles.btnClose}>Close</button>
            </div>

            {/* 🔥 NEW: ANTIFRAUD WORKFLOW SETTINGS */}
            <div style={styles.workflowGrid}>
                <div style={styles.workflowItem}>
                    <label><input type="checkbox" defaultChecked={selectedOffer.has_antifraud} onChange={e => updateOffer(selectedOffer.id, {has_antifraud: e.target.checked})} /> Anti-Fraud (MCP/Evina)</label>
                    <input placeholder="AF Prep URL (#HEADERS_B64#)" style={styles.pInput} defaultValue={selectedOffer.af_prepare_url} onBlur={e => updateOffer(selectedOffer.id, {af_prepare_url: e.target.value})} />
                </div>
                <div style={styles.workflowItem}>
                    <label><input type="checkbox" defaultChecked={selectedOffer.has_status_check} onChange={e => updateOffer(selectedOffer.id, {has_status_check: e.target.checked})} /> Status Check (Shemaroo)</label>
                    <input placeholder="Status URL (#MSISDN#)" style={styles.pInput} defaultValue={selectedOffer.check_status_url} onBlur={e => updateOffer(selectedOffer.id, {check_status_url: e.target.value})} />
                </div>
                <div style={styles.workflowItem}>
                    <label>Workflow Mode</label>
                    <select style={styles.pInput} defaultValue={selectedOffer.af_trigger_point} onChange={e => updateOffer(selectedOffer.id, {af_trigger_point: e.target.value})}>
                        <option value="BEFORE_SEND">Pre-Generate Token</option>
                        <option value="AFTER_SEND">Inject Script in Response</option>
                    </select>
                </div>
            </div>

            <hr style={{opacity:0.2, margin:'20px 0'}} />

            {/* PARAMETERS SECTION */}
            <h4>Manual Parameters</h4>
            <form onSubmit={addParameter} style={styles.inline}>
              <input placeholder="param_key" value={paramForm.param_key} onChange={(e) => setParamForm({ ...paramForm, param_key: e.target.value })} style={styles.pInput} />
              <input placeholder="param_value" value={paramForm.param_value} onChange={(e) => setParamForm({ ...paramForm, param_value: e.target.value })} style={styles.pInput} />
              <button style={styles.btnAdd}>+ Add</button>
            </form>

            <div style={styles.paramGrid}>
              {parameters.map(p => (
                <div key={p.id} style={styles.paramCard}>
                  <div style={{display:'flex', justifyContent:'space-between'}}>
                    <span style={styles.pLabel}>{p.param_key}</span>
                    <span onClick={() => deleteParameter(p.id)} style={{cursor:'pointer', color:'#ef4444'}}>×</span>
                  </div>
                  <input style={styles.pInput} defaultValue={p.param_value} onBlur={(e) => updateParam(p.id, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const glass = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(15px)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "16px",
};

const styles = {
  page: { padding: "40px 20px", background: "linear-gradient(135deg,#020617,#0f172a)", minHeight: "100vh", color: "white", fontFamily: "'Inter', sans-serif" },
  heading: { textAlign: "center", marginBottom: 30, fontSize: '32px', fontWeight:'800' },
  glassBar: { ...glass, display: "flex", gap: 10, flexWrap: "wrap", padding: 20, justifyContent: "center", marginBottom: 30 },
  tableWrap: { width: '100%', overflowX: 'auto', display:'flex', justifyContent:'center' },
  glassTable: { ...glass, width: "100%", maxWidth:'1300px', borderCollapse: "collapse", textAlign: "center" },
  thRow: { background: "rgba(255,255,255,0.1)", height:'50px' },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.05)', height:'60px' },
  td: { padding: '10px' },
  input: { padding: '10px', borderRadius: '8px', border:'1px solid rgba(255,255,255,0.2)', background:'transparent', color:'white' },
  inputSmall: { width: '80px', padding: '10px', borderRadius: '8px', border:'1px solid rgba(255,255,255,0.2)', background:'transparent', color:'white' },
  select: { padding: '10px', borderRadius: '8px', border:'1px solid rgba(255,255,255,0.2)', background:'#1e293b', color:'white' },
  btnCreate: { background: '#3b82f6', color:'white', padding:'10px 25px', borderRadius:'8px', border:'none', cursor:'pointer', fontWeight:'bold' },
  btnManage: { background: '#64748b', color:'white', padding:'5px 12px', borderRadius:'6px', border:'none', cursor:'pointer', fontSize:'12px' },
  btnAction: { background: 'transparent', border:'1px solid #3b82f6', color:'#3b82f6', padding:'5px 10px', borderRadius:'6px', cursor:'pointer', fontSize:'11px' },
  glassCard: { ...glass, marginTop: 30, padding: 30, border:'1px solid #3b82f6' },
  workflowGrid: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:20, marginBottom:20 },
  workflowItem: { display:'flex', flexDirection:'column', gap:8, fontSize:'13px', fontWeight:'bold' },
  paramGrid: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:15, marginTop:20 },
  paramCard: { background:'rgba(255,255,255,0.05)', padding:10, borderRadius:10 },
  pLabel: { fontSize:'10px', color:'#94a3b8', textTransform:'uppercase', fontWeight:'bold' },
  pInput: { width:'100%', background:'rgba(0,0,0,0.2)', border:'1px solid rgba(255,255,255,0.1)', color:'white', padding:'8px', borderRadius:'6px', marginTop:5 },
  btnClose: { background:'#ef4444', color:'white', border:'none', padding:'8px 20px', borderRadius:'8px', cursor:'pointer' },
  badgePrimary: { color: "#22c55e", fontWeight:'bold' },
  badgeFallback: { color: "#facc15", fontWeight:'bold' },
  badgeCap: { color: "#ef4444", fontWeight:'bold' },
};
