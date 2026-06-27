import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { btn, btnRed, input, table, th, td, page } from "../styles/shared.js";

const API_BASE = "https://backend.mob13r.com";

export default function Offers() {
  const token = localStorage.getItem("token");

  const [advertisers, setAdvertisers] = useState([]);
  const [offers, setOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [parameters, setParameters] = useState([]);
  const [paramForm, setParamForm] = useState({ param_key: "", param_value: "" });
  const [offerForm, setOfferForm] = useState({
    otp_length: 4, advertiser_id: "", service_name: "", cpa: "",
    daily_cap: "", geo: "", carrier: "", service_type: "NORMAL",
  });

  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

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

  useEffect(() => { fetchAdvertisers(); fetchOffers(); }, []);

  const updateOffer = async (offerId, payload) => {
    await fetch(`${API_BASE}/api/offers/${offerId}`, {
      method: "PATCH", headers: authHeaders, body: JSON.stringify(payload),
    });
    fetchOffers(offerForm.advertiser_id);
  };

  const createOffer = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/api/offers`, {
      method: "POST", headers: authHeaders, body: JSON.stringify(offerForm),
    });
    const data = await res.json();
    setOffers((prev) => [...prev, data]);
    setOfferForm({ ...offerForm, service_name: "", cpa: "", daily_cap: "", geo: "", carrier: "", service_type: "NORMAL" });
  };

  const addParameter = async (e) => {
    e.preventDefault();
    await fetch(`${API_BASE}/api/offers/${selectedOffer.id}/parameters`, {
      method: "POST", headers: authHeaders, body: JSON.stringify(paramForm),
    });
    setParamForm({ param_key: "", param_value: "" });
    fetchParameters(selectedOffer.id);
  };

  const deleteParameter = async (id) => {
    if (window.confirm("Remove this parameter?")) {
      await fetch(`${API_BASE}/api/offers/parameters/${id}`, { method: "DELETE", headers: authHeaders });
      fetchParameters(selectedOffer.id);
    }
  };

  const updateParamValue = async (id, param_value) => {
    await fetch(`${API_BASE}/api/offers/parameters/${id}`, {
      method: "PATCH", headers: authHeaders, body: JSON.stringify({ param_value }),
    });
  };

  const toggleParam = async (id, is_active) => {
    await fetch(`${API_BASE}/api/offers/parameters/${id}`, {
      method: "PATCH", headers: authHeaders, body: JSON.stringify({ is_active }),
    });
    fetchParameters(selectedOffer.id);
  };

  const changeServiceType = async (offerId, service_type) => {
    await fetch(`${API_BASE}/api/offers/${offerId}/service-type`, {
      method: "PATCH", headers: authHeaders, body: JSON.stringify({ service_type }),
    });
    fetchOffers(offerForm.advertiser_id);
  };

  const handleAIUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("doc", file);
    try {
      const res = await fetch(`${API_BASE}/api/auto-integrate/${selectedOffer.id}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData,
      });
      if (res.ok) { alert("AI Magic: Integration Completed Successfully!"); fetchOffers(offerForm.advertiser_id); fetchParameters(selectedOffer.id); }
      else alert("AI Integration Failed. Please check the document format.");
    } catch (err) { console.error("AI Error:", err); }
  };

  const remaining = (o) => !o.daily_cap ? "0" : Math.max(o.daily_cap - o.today_hits, 0);
  const autoRevenue = (o) => o.cpa ? `$${(Number(o.cpa) * Number(o.today_hits || 0)).toFixed(2)}` : "$0.00";

  const routeBadge = (o) => {
    if (o.daily_cap && o.today_hits >= o.daily_cap) return <span style={styles.badgeCap}>🔴 Cap Reached</span>;
    if (o.service_type === "FALLBACK") return <span style={styles.badgeFallback}>🟡 Fallback</span>;
    return <span style={styles.badgePrimary}>🟢 Primary</span>;
  };

  // Split params: URL fields vs regular params
  const urlFields = ["pin_send_url","pin_send_fallback_url","verify_pin_url","verify_pin_fallback_url","check_status_url","portal_url"];
  const urlParams = parameters.filter(p => urlFields.includes(p.param_key));
  const regularParams = parameters.filter(p => !urlFields.includes(p.param_key));
  const activeParams = regularParams.filter(p => p.is_active);
  const inactiveParams = regularParams.filter(p => !p.is_active);

  return (
    <>
      <Navbar />
      <div style={page}>
        <h1 style={{fontFamily:"Syne,sans-serif",fontSize:28,fontWeight:700,color:"#4a2f3f",marginBottom:24}}>
          Universal Offer Engine
        </h1>

        {/* CREATE BAR */}
        <form onSubmit={createOffer} style={styles.topBar}>
          <select style={styles.select} value={offerForm.advertiser_id}
            onChange={(e) => { const id=e.target.value; setOfferForm({...offerForm,advertiser_id:id}); setSelectedOffer(null); fetchOffers(id); }}>
            <option value="">All Advertisers</option>
            {advertisers.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input style={styles.smallInput} placeholder="Service" required value={offerForm.service_name} onChange={(e) => setOfferForm({...offerForm,service_name:e.target.value})} />
          <input style={styles.smallInput} placeholder="CPA ($)" value={offerForm.cpa} onChange={(e) => setOfferForm({...offerForm,cpa:e.target.value})} />
          <input style={styles.smallInput} placeholder="Cap" value={offerForm.daily_cap} onChange={(e) => setOfferForm({...offerForm,daily_cap:e.target.value})} />
          <input style={styles.smallInput} placeholder="Geo" value={offerForm.geo} onChange={(e) => setOfferForm({...offerForm,geo:e.target.value})} />
          <input style={styles.smallInput} placeholder="Carrier" value={offerForm.carrier} onChange={(e) => setOfferForm({...offerForm,carrier:e.target.value})} />
          <select style={styles.select} value={offerForm.service_type} onChange={(e) => setOfferForm({...offerForm,service_type:e.target.value})}>
            <option value="NORMAL">Primary</option>
            <option value="FALLBACK">Fallback</option>
          </select>
          <button type="submit" style={btn}>Create</button>
        </form>

        {/* OFFER TABLE */}
        <div style={styles.tableWrap}>
          <table style={table}>
            <thead>
              <tr>{["ID","Advertiser","Service","CPA ($)","Geo","Carrier","OTP Len","Cap","Used","Remain","Revenue ($)","Route","Control","Params"].map(h=><th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {offers.map(o => (
                <tr key={o.id}>
                  <td style={td}><span style={{background:"rgba(232,133,106,0.12)",color:"#e8856a",padding:"2px 8px",borderRadius:6,fontSize:12,fontWeight:700}}>{o.id}</span></td>
                  <td style={td}>{o.advertiser_name || "-"}</td>
                  <td style={td}><input style={styles.cellInput} defaultValue={o.service_name} onBlur={(e)=>updateOffer(o.id,{service_name:e.target.value})} /></td>
                  <td style={td}><input style={styles.cellInput} defaultValue={o.cpa||""} onBlur={(e)=>updateOffer(o.id,{cpa:e.target.value})} /></td>
                  <td style={td}><input style={styles.cellInput} defaultValue={o.geo||""} onBlur={(e)=>updateOffer(o.id,{geo:e.target.value})} /></td>
                  <td style={td}><input style={styles.cellInput} defaultValue={o.carrier||""} onBlur={(e)=>updateOffer(o.id,{carrier:e.target.value})} /></td>
                  <td style={td}><input style={{...styles.cellInput,width:50}} type="number" min="4" max="6" defaultValue={o.otp_length||4} onBlur={(e)=>updateOffer(o.id,{otp_length:Number(e.target.value)})} /></td>
                  <td style={td}><input style={styles.cellInput} defaultValue={o.daily_cap===null?"":o.daily_cap} placeholder="0" onBlur={(e)=>{const val=e.target.value===""?0:parseInt(e.target.value);updateOffer(o.id,{daily_cap:val});}} /></td>
                  <td style={td}>{o.today_hits}</td>
                  <td style={td}>{remaining(o)}</td>
                  <td style={td}>{autoRevenue(o)}</td>
                  <td style={td}>{routeBadge(o)}</td>
                  <td style={td}><button onClick={()=>changeServiceType(o.id,o.service_type==="NORMAL"?"FALLBACK":"NORMAL")} style={styles.smallBtn}>{o.service_type==="NORMAL"?"Set Fallback":"Set Primary"}</button></td>
                  <td style={td}><button onClick={()=>{setSelectedOffer(o);fetchParameters(o.id);}} style={{...styles.smallBtn,color:"#e8856a",borderColor:"rgba(232,133,106,0.4)"}}>⚙ Manage</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CONFIGURE PANEL */}
        {selectedOffer && (
          <div style={styles.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h3 style={{color:"#4a2f3f",fontSize:18,fontWeight:700,fontFamily:"Syne,sans-serif"}}>
                ⚙ Configuring: <span style={{color:"#e8856a"}}>{selectedOffer.service_name}</span>
              </h3>
              <button onClick={()=>setSelectedOffer(null)} style={btnRed}>✕ Close</button>
            </div>

            {/* AI MAGIC */}
            <div style={styles.aiBox}>
              <h4 style={{marginTop:0,color:"#e8856a",fontFamily:"Syne,sans-serif"}}>🚀 AI Magic Integrator</h4>
              <p style={{fontSize:12,color:"#c07050",fontWeight:"bold",fontFamily:"'Lora',serif"}}>Upload API Document (PDF/DOCX) to auto-configure this service</p>
              <input type="file" accept=".pdf,.docx" onChange={handleAIUpload} style={{fontSize:12,color:"#6b4f6a"}} />
            </div>

            {/* WORKFLOW */}
            <div style={styles.workflowGrid}>
              <div>
                <label style={styles.workflowLabel}>
                  <input type="checkbox" defaultChecked={selectedOffer.has_antifraud} onChange={e=>updateOffer(selectedOffer.id,{has_antifraud:e.target.checked})} /> Enable Anti-Fraud
                </label>
                <input placeholder="AF Prep URL" style={{...styles.cellInput,width:"100%",marginTop:6}} defaultValue={selectedOffer.af_prepare_url} onBlur={e=>updateOffer(selectedOffer.id,{af_prepare_url:e.target.value})} />
              </div>
              <div>
                <label style={styles.workflowLabel}>
                  <input type="checkbox" defaultChecked={selectedOffer.has_status_check} onChange={e=>updateOffer(selectedOffer.id,{has_status_check:e.target.checked})} /> Status Check
                </label>
                <input placeholder="Status Check URL" style={{...styles.cellInput,width:"100%",marginTop:6}} defaultValue={selectedOffer.check_status_url} onBlur={e=>updateOffer(selectedOffer.id,{check_status_url:e.target.value})} />
              </div>
              <div>
                <label style={styles.workflowLabel}>Workflow Mode</label>
                <select style={{...styles.select,width:"100%",marginTop:6}} defaultValue={selectedOffer.af_trigger_point} onChange={e=>updateOffer(selectedOffer.id,{af_trigger_point:e.target.value})}>
                  <option value="BEFORE_SEND">Pre-Generate Token</option>
                  <option value="AFTER_SEND">Inject Script in Response</option>
                </select>
              </div>
            </div>

            {/* URL FIELDS */}
            <div style={styles.sectionHead}>🔗 API URLs</div>
            <div style={styles.urlGrid}>
              {urlParams.map(p => (
                <div key={p.id} style={styles.urlRow}>
                  <div style={styles.urlLabel}>{p.param_key.replace(/_/g," ").toUpperCase()}</div>
                  <input
                    style={{...styles.cellInput,width:"100%",textAlign:"left"}}
                    defaultValue={p.param_value}
                    placeholder={`Enter ${p.param_key}...`}
                    onBlur={e=>updateParamValue(p.id, e.target.value)}
                  />
                </div>
              ))}
            </div>

            {/* TWO COLUMN: ACTIVE | AVAILABLE */}
            <div style={styles.sectionHead}>📋 Parameters</div>
            <div style={styles.paramColumns}>

              {/* LEFT: Active Parameters — jo pass honge */}
              <div style={styles.paramCol}>
                <div style={styles.colHead}>
                  <span>✅ Active Parameters</span>
                  <span style={{fontSize:11,color:"#9b7faa"}}>({activeParams.length} selected — yeh advertiser ko jayenge)</span>
                </div>
                <div style={styles.paramList}>
                  {activeParams.length === 0 && (
                    <div style={styles.emptyMsg}>Koi bhi parameter active nahi hai. Right side se select karo.</div>
                  )}
                  {activeParams.map(p => (
                    <div key={p.id} style={styles.activeParamRow}>
                      <div style={styles.paramKey}>{p.param_key}</div>
                      <input
                        style={{...styles.cellInput,flex:1,textAlign:"left",fontSize:12}}
                        defaultValue={p.param_value}
                        onBlur={e=>updateParamValue(p.id, e.target.value)}
                      />
                      <button
                        onClick={()=>toggleParam(p.id, false)}
                        style={styles.removeBtn}
                        title="Deactivate"
                      >✕</button>
                    </div>
                  ))}
                </div>

                {/* Custom param add */}
                <form onSubmit={addParameter} style={{marginTop:12,display:"flex",gap:8}}>
                  <input style={{...styles.smallInput,flex:1}} placeholder="param_key" value={paramForm.param_key} onChange={e=>setParamForm({...paramForm,param_key:e.target.value})} />
                  <input style={{...styles.smallInput,flex:1}} placeholder="param_value" value={paramForm.param_value} onChange={e=>setParamForm({...paramForm,param_value:e.target.value})} />
                  <button style={{...btn,padding:"6px 14px",fontSize:12}}>+ Add</button>
                </form>
              </div>

              {/* RIGHT: Available Parameters — jo inactive hain */}
              <div style={styles.paramCol}>
                <div style={styles.colHead}>
                  <span>📦 Available Parameters</span>
                  <span style={{fontSize:11,color:"#9b7faa"}}>(click to activate)</span>
                </div>
                <div style={styles.paramList}>
                  {inactiveParams.length === 0 && (
                    <div style={styles.emptyMsg}>Sab parameters active hain.</div>
                  )}
                  {inactiveParams.map(p => (
                    <div key={p.id} style={styles.inactiveParamRow}>
                      <div style={styles.paramKey}>{p.param_key}</div>
                      <div style={{fontSize:11,color:"#b89ab0",flex:1}}>{p.param_value || "—"}</div>
                      <button
                        onClick={()=>toggleParam(p.id, true)}
                        style={styles.activateBtn}
                        title="Activate"
                      >+ Use</button>
                      <button
                        onClick={()=>deleteParameter(p.id)}
                        style={{...styles.removeBtn,marginLeft:4}}
                        title="Delete"
                      >🗑</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  topBar: { display:"flex", gap:10, flexWrap:"wrap", marginBottom:20, alignItems:"center", background:"#fff", border:"1px solid #e8d0dc", padding:16, borderRadius:16, boxShadow:"0 2px 8px rgba(210,160,180,0.1)" },
  tableWrap: { background:"#fff", border:"1px solid #e8d0dc", padding:8, borderRadius:16, overflowX:"auto" },
  smallInput: { background:"#fff", border:"1px solid #e8d0dc", color:"#4a2f3f", borderRadius:10, padding:"8px 12px", fontSize:13, outline:"none", fontFamily:"'Lora',serif", fontWeight:600 },
  cellInput: { width:"90%", textAlign:"center", padding:6, background:"#fff", border:"1px solid #e8d0dc", color:"#4a2f3f", borderRadius:8, fontSize:13, outline:"none", fontFamily:"'Lora',serif", fontWeight:600 },
  select: { background:"#fff", border:"1px solid #e8d0dc", color:"#4a2f3f", borderRadius:10, padding:"8px 12px", fontSize:13, outline:"none", fontFamily:"'Lora',serif" },
  smallBtn: { fontSize:12, padding:"6px 12px", background:"#fff", border:"1px solid #e8d0dc", color:"#9b7faa", borderRadius:8, cursor:"pointer", fontFamily:"'Lora',serif" },
  card: { background:"#fff", border:"1px solid #e8d0dc", padding:24, marginTop:24, borderRadius:16, boxShadow:"0 4px 20px rgba(210,160,180,0.08)" },
  aiBox: { background:"rgba(232,133,106,0.06)", padding:20, borderRadius:12, border:"2px dashed rgba(232,133,106,0.35)", marginBottom:20 },
  workflowGrid: { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20, background:"#fdf6f9", padding:16, borderRadius:12, marginBottom:20, border:"1px solid #eedde8" },
  workflowLabel: { fontSize:12, fontWeight:600, color:"#6b4f6a", fontFamily:"'Lora',serif" },

  sectionHead: { fontSize:14, fontWeight:700, color:"#4a2f3f", fontFamily:"Syne,sans-serif", marginBottom:12, marginTop:20, paddingBottom:6, borderBottom:"2px solid #eedde8" },

  urlGrid: { display:"grid", gap:10, marginBottom:8 },
  urlRow: { display:"grid", gridTemplateColumns:"160px 1fr", gap:10, alignItems:"center" },
  urlLabel: { fontSize:11, fontWeight:700, color:"#9b7faa", fontFamily:"'Lora',serif", textTransform:"uppercase", letterSpacing:"0.05em" },

  paramColumns: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginTop:8 },
  paramCol: { border:"1px solid #eedde8", borderRadius:12, overflow:"hidden" },
  colHead: { background:"#f5eef8", padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", fontWeight:700, fontSize:13, color:"#4a2f3f", fontFamily:"Syne,sans-serif", borderBottom:"1px solid #eedde8" },
  paramList: { padding:8, maxHeight:380, overflowY:"auto", display:"grid", gap:6 },
  emptyMsg: { textAlign:"center", color:"#b89ab0", fontSize:12, padding:20, fontFamily:"'Lora',serif" },

  activeParamRow: { display:"flex", alignItems:"center", gap:8, background:"rgba(232,133,106,0.05)", border:"1px solid rgba(232,133,106,0.2)", borderRadius:8, padding:"6px 10px" },
  inactiveParamRow: { display:"flex", alignItems:"center", gap:8, background:"#fdf6f9", border:"1px solid #eedde8", borderRadius:8, padding:"6px 10px" },

  paramKey: { fontSize:12, fontWeight:700, color:"#4a2f3f", fontFamily:"'Lora',serif", minWidth:120 },
  activateBtn: { fontSize:11, padding:"4px 10px", background:"linear-gradient(135deg,#e8856a,#d4709a)", border:"none", color:"#fff", borderRadius:6, cursor:"pointer", fontFamily:"'Lora',serif", fontWeight:600, whiteSpace:"nowrap" },
  removeBtn: { fontSize:11, padding:"4px 8px", background:"rgba(220,100,100,0.08)", border:"1px solid rgba(220,100,100,0.2)", color:"#dc6464", borderRadius:6, cursor:"pointer", whiteSpace:"nowrap" },

  badgePrimary: { color:"#2f9e60", fontWeight:600, fontSize:11, fontFamily:"'Lora',serif" },
  badgeFallback: { color:"#c07000", fontWeight:600, fontSize:11, fontFamily:"'Lora',serif" },
  badgeCap: { color:"#dc6464", fontWeight:600, fontSize:11, fontFamily:"'Lora',serif" },
};
