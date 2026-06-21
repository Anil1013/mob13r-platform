import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { btn, btnRed, input, table, th, td, page } from "../styles/shared.js";

const API_BASE = "https://backend.mob13r.com";

export default function Offers() {
  const token = localStorage.getItem("token");

  /* ---------------- STATE ---------------- */
  const [advertisers, setAdvertisers] = useState([]);
  const [offers, setOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [parameters, setParameters] = useState([]);

  const [offerForm, setOfferForm] = useState({
    otp_length: 4,
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
    const res = await fetch(`${API_BASE}/api/advertisers`, {
      headers: authHeaders,
    });
    setAdvertisers(await res.json());
  };

  const fetchOffers = async (advertiserId = "") => {
    const url = advertiserId
      ? `${API_BASE}/api/offers?advertiser_id=${advertiserId}`
      : `${API_BASE}/api/offers`;

    const res = await fetch(url, { headers: authHeaders });
    const data = await res.json();
    setOffers(Array.isArray(data) ? data : []);
  };

  const fetchParameters = async (offerId) => {
    const res = await fetch(
      `${API_BASE}/api/offers/${offerId}/parameters`,
      { headers: authHeaders }
    );
    setParameters(await res.json());
  };

  useEffect(() => {
    fetchAdvertisers();
    fetchOffers();
  }, []);

  /* ---------------- UPDATE OFFER (Original Kept) ---------------- */
  const updateOffer = async (offerId, payload) => {
    await fetch(`${API_BASE}/api/offers/${offerId}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    fetchOffers(offerForm.advertiser_id);
  };

  /* ---------------- CREATE OFFER (Original Kept) ---------------- */
  const createOffer = async (e) => {
    e.preventDefault();

    const res = await fetch(`${API_BASE}/api/offers`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(offerForm),
    });

    const data = await res.json();
    setOffers((prev) => [...prev, data]);

    setOfferForm({
      ...offerForm,
      service_name: "",
      cpa: "",
      daily_cap: "",
      geo: "",
      carrier: "",
      service_type: "NORMAL",
    });
  };

  /* ---------------- PARAMETERS (Original Kept) ---------------- */
  const addParameter = async (e) => {
    e.preventDefault();

    await fetch(
      `${API_BASE}/api/offers/${selectedOffer.id}/parameters`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(paramForm),
      }
    );

    setParamForm({ param_key: "", param_value: "" });
    fetchParameters(selectedOffer.id);
  };

  const deleteParameter = async (id) => {
    if (window.confirm("Remove this parameter?")) {
      await fetch(
        `${API_BASE}/api/offers/parameters/${id}`,
        { method: "DELETE", headers: authHeaders }
      );
      fetchParameters(selectedOffer.id);
    }
  };

  /* ---------------- PROMOTE / DEMOTE ---------------- */
  const changeServiceType = async (offerId, service_type) => {
    await fetch(`${API_BASE}/api/offers/${offerId}/service-type`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ service_type }),
    });
    fetchOffers(offerForm.advertiser_id);
  };

  /* AI AUTO-INTEGRATION HANDLER */
  const handleAIUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("doc", file);

    try {
      const res = await fetch(`${API_BASE}/api/auto-integrate/${selectedOffer.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        alert("AI Magic: Integration Completed Successfully!");
        fetchOffers(offerForm.advertiser_id);
        fetchParameters(selectedOffer.id);
      } else {
        alert("AI Integration Failed. Please check the document format.");
      }
    } catch (err) {
      console.error("AI Error:", err);
    }
  };

  /* ---------------- HELPERS ---------------- */
  const remaining = (o) =>
    !o.daily_cap ? "0" : Math.max(o.daily_cap - o.today_hits, 0);

  const autoRevenue = (o) =>
    o.cpa ? `$${(Number(o.cpa) * Number(o.today_hits || 0)).toFixed(2)}` : "$0.00";

  const routeBadge = (o) => {
    if (o.daily_cap && o.today_hits >= o.daily_cap) {
      return <span style={styles.badgeCap}>🔴 Cap Reached</span>;
    }
    if (o.service_type === "FALLBACK") {
      return <span style={styles.badgeFallback}>🟡 Fallback</span>;
    }
    return <span style={styles.badgePrimary}>🟢 Primary</span>;
  };

  /* ---------------- UI ---------------- */
  return (
    <>
      <Navbar />

      <div style={page}>
        <h1 style={{fontFamily:"Syne,sans-serif",fontSize:28,fontWeight:700,color:"#f1f5f9",marginBottom:24}}>
          Universal Offer Engine
        </h1>

        {/* CREATE BAR */}
        <form onSubmit={createOffer} style={styles.topBar}>
          <select
            style={styles.select}
            value={offerForm.advertiser_id}
            onChange={(e) => {
              const id = e.target.value;
              setOfferForm({ ...offerForm, advertiser_id: id });
              setSelectedOffer(null);
              fetchOffers(id);
            }}
          >
            <option value="">All Advertisers</option>
            {advertisers.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          <input style={styles.smallInput} placeholder="Service" required
            value={offerForm.service_name}
            onChange={(e) =>
              setOfferForm({ ...offerForm, service_name: e.target.value })
            }
          />

          <input style={styles.smallInput} placeholder="CPA ($)" value={offerForm.cpa}
            onChange={(e) =>
              setOfferForm({ ...offerForm, cpa: e.target.value })
            }
          />

          <input style={styles.smallInput} placeholder="Cap" value={offerForm.daily_cap}
            onChange={(e) =>
              setOfferForm({ ...offerForm, daily_cap: e.target.value })
            }
          />

          <input style={styles.smallInput} placeholder="Geo" value={offerForm.geo}
            onChange={(e) =>
              setOfferForm({ ...offerForm, geo: e.target.value })
            }
          />

          <input style={styles.smallInput} placeholder="Carrier" value={offerForm.carrier}
            onChange={(e) =>
              setOfferForm({ ...offerForm, carrier: e.target.value })
            }
          />

          <select
            style={styles.select}
            value={offerForm.service_type}
            onChange={(e) =>
              setOfferForm({ ...offerForm, service_type: e.target.value })
            }
          >
            <option value="NORMAL">Primary</option>
            <option value="FALLBACK">Fallback</option>
          </select>

          <button type="submit" style={btn}>Create</button>
        </form>

        {/* OFFER TABLE */}
        <div style={styles.tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                {[
                  "ID","Advertiser","Service","CPA ($)",
                  "Geo","Carrier","OTP Len","Cap","Used","Remain",
                  "Revenue ($)","Route","Control","Params"
                ].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {offers.map(o => (
                <tr key={o.id}>
                  <td style={td}>
                    <span style={{background:"rgba(59,130,246,0.1)",color:"#60a5fa",padding:"2px 8px",borderRadius:6,fontSize:12,fontWeight:600}}>{o.id}</span>
                  </td>
                  <td style={td}>{o.advertiser_name || "-"}</td>

                  <td style={td}>
                    <input
                      style={styles.cellInput}
                      defaultValue={o.service_name}
                      onBlur={(e) =>
                        updateOffer(o.id, { service_name: e.target.value })
                      }
                    />
                  </td>

                  <td style={td}>
                    <input
                      style={styles.cellInput}
                      defaultValue={o.cpa || ""}
                      onBlur={(e) =>
                        updateOffer(o.id, { cpa: e.target.value })
                      }
                    />
                  </td>

                  <td style={td}>
                    <input
                      style={styles.cellInput}
                      defaultValue={o.geo || ""}
                      onBlur={(e) =>
                        updateOffer(o.id, { geo: e.target.value })
                      }
                    />
                  </td>

                  <td style={td}>
                    <input
                      style={styles.cellInput}
                      defaultValue={o.carrier || ""}
                      onBlur={(e) =>
                        updateOffer(o.id, { carrier: e.target.value })
                      }
                    />
                  </td>

                  <td style={td}>
                    <input
                      style={{...styles.cellInput, width:50}}
                      type="number"
                      min="4" max="6"
                      defaultValue={o.otp_length || 4}
                      onBlur={(e) =>
                        updateOffer(o.id, { otp_length: Number(e.target.value) })
                      }
                    />
                  </td>

                  <td style={td}>
                    <input
                      style={styles.cellInput}
                      defaultValue={o.daily_cap === null ? "" : o.daily_cap}
                      placeholder="0" 
                      onBlur={(e) => {
                        const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                        updateOffer(o.id, { daily_cap: val });
                      }}
                    />
                  </td>

                  <td style={td}>{o.today_hits}</td>
                  <td style={td}>{remaining(o)}</td>
                  <td style={td}>{autoRevenue(o)}</td>
                  <td style={td}>{routeBadge(o)}</td>

                  <td style={td}>
                    <button 
                      onClick={() => changeServiceType(o.id, o.service_type === "NORMAL" ? "FALLBACK" : "NORMAL")}
                      style={{...styles.smallBtn}}
                    >
                      {o.service_type === "NORMAL" ? "Set Fallback" : "Set Primary"}
                    </button>
                  </td>

                  <td style={td}>
                    <button onClick={() => {
                      setSelectedOffer(o);
                      fetchParameters(o.id);
                    }} style={styles.smallBtn}>
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PARAMETERS & ANTI-FRAUD SECTION */}
        {selectedOffer && (
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{color:"#f1f5f9",fontSize:18,fontWeight:600,fontFamily:"Syne,sans-serif"}}>
                  Configuring: {selectedOffer.service_name}
                </h3>
                <button onClick={() => setSelectedOffer(null)} style={btnRed}>Close</button>
            </div>

            {/* AI MAGIC INTEGRATOR SECTION */}
            <div style={styles.aiBox}>
                <h4 style={{ marginTop: 0, color: '#93c5fd', fontFamily:"Syne,sans-serif" }}>🚀 AI Magic Integrator</h4>
                <p style={{ fontSize: '12px', color: '#60a5fa', fontWeight: 'bold' }}>Upload API Document (PDF/DOCX) to auto-configure this service</p>
                <input type="file" accept=".pdf,.docx" onChange={handleAIUpload} style={{ fontSize: '12px', color:"#94a3b8" }} />
            </div>

            {/* WORKFLOW SECTION */}
            <div style={styles.workflowGrid}>
                <div>
                   <label style={styles.workflowLabel}>
                     <input type="checkbox" defaultChecked={selectedOffer.has_antifraud} onChange={e => updateOffer(selectedOffer.id, { has_antifraud: e.target.checked })} /> Enable Anti-Fraud
                   </label>
                   <input placeholder="AF Prep URL" style={{...styles.cellInput, width:"100%", marginTop:6}} defaultValue={selectedOffer.af_prepare_url} onBlur={e => updateOffer(selectedOffer.id, { af_prepare_url: e.target.value })} />
                </div>
                <div>
                   <label style={styles.workflowLabel}>
                     <input type="checkbox" defaultChecked={selectedOffer.has_status_check} onChange={e => updateOffer(selectedOffer.id, { has_status_check: e.target.checked })} /> Shemaroo Status Check
                   </label>
                   <input placeholder="Status Check URL" style={{...styles.cellInput, width:"100%", marginTop:6}} defaultValue={selectedOffer.check_status_url} onBlur={e => updateOffer(selectedOffer.id, { check_status_url: e.target.value })} />
                </div>
                <div>
                   <label style={styles.workflowLabel}>Workflow Mode</label>
                   <select style={{...styles.select, width:"100%", marginTop:6}} defaultValue={selectedOffer.af_trigger_point} onChange={e => updateOffer(selectedOffer.id, { af_trigger_point: e.target.value })}>
                      <option value="BEFORE_SEND">Pre-Generate Token</option>
                      <option value="AFTER_SEND">Inject Script in Response</option>
                   </select>
                </div>
            </div>

            <form onSubmit={addParameter} style={styles.inline}>
              <input
                style={styles.smallInput}
                placeholder="param_key"
                value={paramForm.param_key}
                onChange={(e) =>
                  setParamForm({ ...paramForm, param_key: e.target.value })
                }
              />
              <input
                style={styles.smallInput}
                placeholder="param_value"
                value={paramForm.param_value}
                onChange={(e) =>
                  setParamForm({ ...paramForm, param_value: e.target.value })
                }
              />
              <button style={btn}>Add</button>
            </form>

            <table style={table}>
              <tbody>
                {parameters.map((p) => (
                  <tr key={p.id}>
                    <td style={{ ...td, textAlign: 'left', fontWeight: 600, color:"#f1f5f9" }}>{p.param_key}</td>
                    <td style={td}>
                        <input 
                            style={{...styles.cellInput, width: '100%'}} 
                            defaultValue={p.param_value} 
                            onBlur={(e) => {
                                fetch(`${API_BASE}/api/offers/parameters/${p.id}`, {
                                    method: "PATCH",
                                    headers: authHeaders,
                                    body: JSON.stringify({ param_value: e.target.value }),
                                });
                            }}
                        />
                    </td>
                    <td style={td}>
                      <button onClick={() => deleteParameter(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>❌</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  topBar: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20, alignItems:"center", background: '#0d1326', border:"1px solid rgba(255,255,255,0.07)", padding: '16px', borderRadius: '16px' },
  tableWrap: { background: '#0d1326', border:"1px solid rgba(255,255,255,0.07)", padding: '8px', borderRadius: '16px', overflowX:"auto" },

  smallInput: { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"#f1f5f9", borderRadius:10, padding:"8px 12px", fontSize:13, outline:"none" },
  cellInput: { width: "90%", textAlign: "center", padding: 6, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"#f1f5f9", borderRadius: 8, fontSize:13, outline:"none" },
  select: { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"#f1f5f9", borderRadius:10, padding:"8px 12px", fontSize:13, outline:"none" },

  smallBtn: { fontSize: '11px', padding: '6px 10px', background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8", borderRadius:8, cursor:"pointer" },

  card: { background: "#0d1326", border:"1px solid rgba(255,255,255,0.07)", padding: 24, marginTop: 24, borderRadius: '16px' },
  inline: { display: "flex", gap: 10, marginBottom: 20, marginTop: 4 },

  aiBox: { background: 'rgba(59,130,246,0.06)', padding: '20px', borderRadius: '12px', border: '2px dashed rgba(59,130,246,0.3)', marginBottom: '20px' },
  workflowGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', background: '#0a0f1e', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.06)' },
  workflowLabel: { fontSize: '12px', fontWeight: 600, color:"#cbd5e1" },

  badgePrimary: { color: "#4ade80", fontWeight: 600, fontSize: '11px' },
  badgeFallback: { color: "#fbbf24", fontWeight: 600, fontSize: '11px' },
  badgeCap: { color: "#f87171", fontWeight: 600, fontSize: '11px' },
};
