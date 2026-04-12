import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

const API_BASE = "https://backend.mob13r.com";

export default function Offers() {
  const token = localStorage.getItem("token");
  const [advertisers, setAdvertisers] = useState([]);
  const [offers, setOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [parameters, setParameters] = useState([]);
  const [offerForm, setOfferForm] = useState({ advertiser_id: "", service_name: "", cpa: "", daily_cap: "", geo: "", carrier: "", service_type: "NORMAL" });
  const [paramForm, setParamForm] = useState({ param_key: "", param_value: "" });

  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchOffers = async (advId = "") => {
    const url = advId ? `${API_BASE}/api/offers?advertiser_id=${advId}` : `${API_BASE}/api/offers`;
    const res = await fetch(url, { headers: authHeaders });
    const data = await res.json();
    setOffers(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/advertisers`, { headers: authHeaders }).then(r => r.json()).then(setAdvertisers);
    fetchOffers();
  }, []);

  const updateOffer = async (id, payload) => {
    await fetch(`${API_BASE}/api/offers/${id}`, { method: "PATCH", headers: authHeaders, body: JSON.stringify(payload) });
    fetchOffers();
  };

  /* 🔥 FALLBACK TOGGLE LOGIC */
  const toggleServiceType = async (offerId, currentType) => {
    const newType = currentType === "NORMAL" ? "FALLBACK" : "NORMAL";
    await fetch(`${API_BASE}/api/offers/${offerId}/service-type`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ service_type: newType }),
    });
    fetchOffers();
  };

  const addParam = async (e) => {
    e.preventDefault();
    if (!paramForm.param_key) return alert("Enter Key Name");
    await fetch(`${API_BASE}/api/offers/${selectedOffer.id}/parameters`, { method: "POST", headers: authHeaders, body: JSON.stringify(paramForm) });
    setParamForm({ param_key: "", param_value: "" });
    const res = await fetch(`${API_BASE}/api/offers/${selectedOffer.id}/parameters`, { headers: authHeaders });
    setParameters(await res.json());
  };

  const updateParam = async (id, val) => {
    await fetch(`${API_BASE}/api/offers/parameters/${id}`, { method: "PATCH", headers: authHeaders, body: JSON.stringify({ param_value: val }) });
  };

  const deleteParam = async (id) => {
    if (window.confirm("Remove this parameter?")) {
      await fetch(`${API_BASE}/api/offers/parameters/${id}`, { method: "DELETE", headers: authHeaders });
      const res = await fetch(`${API_BASE}/api/offers/${selectedOffer.id}/parameters`, { headers: authHeaders });
      setParameters(await res.json());
    }
  };

  const remaining = (o) => !o.daily_cap ? "∞" : Math.max(o.daily_cap - o.today_hits, 0);
  const revenue = (o) => o.cpa ? `$${(Number(o.cpa) * Number(o.today_hits || 0)).toFixed(2)}` : "$0.00";

  return (
    <>
      <Navbar />
      <div style={styles.page}>
        <div style={styles.container}>
          <h1 style={styles.heroTitle}>Universal Offer Engine</h1>
          
          {/* CREATE BOX */}
          <form style={styles.topBar} onSubmit={async (e) => {
            e.preventDefault();
            await fetch(`${API_BASE}/api/offers`, { method: "POST", headers: authHeaders, body: JSON.stringify(offerForm) });
            fetchOffers();
          }}>
            <select style={styles.select} value={offerForm.advertiser_id} onChange={e => setOfferForm({...offerForm, advertiser_id: e.target.value})}>
              <option value="">Select Advertiser</option>
              {advertisers.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <input placeholder="Service Name" style={styles.input} value={offerForm.service_name} onChange={e => setOfferForm({...offerForm, service_name: e.target.value})} />
            <input placeholder="CPA" style={styles.inputSmall} value={offerForm.cpa} onChange={e => setOfferForm({...offerForm, cpa: e.target.value})} />
            <input placeholder="Geo" style={styles.inputSmall} value={offerForm.geo} onChange={e => setOfferForm({...offerForm, geo: e.target.value})} />
            <input placeholder="Carrier" style={styles.inputSmall} value={offerForm.carrier} onChange={e => setOfferForm({...offerForm, carrier: e.target.value})} />
            <button type="submit" style={styles.btnPrimary}>+ Create New</button>
          </form>

          {/* MAIN TABLE */}
          <div style={styles.tableWrapper}>
            <table style={styles.mainTable}>
              <thead>
                <tr style={styles.thRow}>
                  <th>ID</th><th>Advertiser</th><th>Service Name</th><th>Geo</th><th>Carrier</th><th>CPA</th><th>Cap</th><th>Used</th><th>Remain</th><th>Revenue</th><th>Route</th><th>Control</th>
                </tr>
              </thead>
              <tbody>
                {offers.map(o => (
                  <tr key={o.id} style={styles.tr}>
                    <td style={styles.td}>{o.id}</td>
                    <td style={{...styles.td, fontWeight: '700', textAlign: 'left', paddingLeft: '20px'}}>{o.advertiser_name}</td>
                    <td style={{...styles.td, textAlign: 'left'}}>{o.service_name}</td>
                    <td style={styles.td}>{o.geo || "-"}</td>
                    <td style={styles.td}>{o.carrier || "-"}</td>
                    <td style={{...styles.td, color: '#16a34a', fontWeight: '700'}}>${o.cpa}</td>
                    <td style={styles.td}>{o.daily_cap || '∞'}</td>
                    <td style={{...styles.td, fontWeight: '700'}}>{o.today_hits}</td>
                    <td style={{...styles.td, color: '#ef4444'}}>{remaining(o)}</td>
                    <td style={{...styles.td, color: '#3b82f6', fontWeight: '700'}}>{revenue(o)}</td>
                    
                    {/* 🔥 ROUTE BADGE & BUTTON */}
                    <td style={styles.td}>
                        <span style={o.service_type === 'NORMAL' ? styles.badgePrimary : styles.badgeFallback}>
                            {o.service_type === 'NORMAL' ? '🟢 Primary' : '🟡 Fallback'}
                        </span>
                    </td>

                    <td style={styles.td}>
                      <div style={{display: 'flex', gap: '5px', justifyContent: 'center'}}>
                        <button 
                            style={o.service_type === 'NORMAL' ? styles.btnMakeFallback : styles.btnMakePrimary}
                            onClick={() => toggleServiceType(o.id, o.service_type)}
                        >
                            {o.service_type === 'NORMAL' ? 'Set Fallback' : 'Set Primary'}
                        </button>
                        <button style={styles.btnManage} onClick={async () => {
                            setSelectedOffer(o);
                            const res = await fetch(`${API_BASE}/api/offers/${o.id}/parameters`, { headers: authHeaders });
                            setParameters(await res.json());
                        }}>Manage</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* CONFIGURATION PANEL (UNCHANGED LOGIC) */}
          {selectedOffer && (
            <div style={styles.manageCard}>
              <div style={styles.manageHeader}>
                <h2 style={{margin:0}}>Configuring: <span style={{color: '#3b82f6'}}>{selectedOffer.advertiser_name} - {selectedOffer.service_name}</span></h2>
                <button style={styles.btnClose} onClick={() => setSelectedOffer(null)}>Close</button>
              </div>
              
              {/* Antifraud Workflow... */}
              <div style={styles.manualBox}>
                <h4>+ Add Custom Parameter</h4>
                <form onSubmit={addParam} style={{display: 'flex', gap: '10px'}}>
                    <input placeholder="param_key" style={styles.input} value={paramForm.param_key} onChange={e => setParamForm({...paramForm, param_key: e.target.value})} />
                    <input placeholder="value" style={styles.input} value={paramForm.param_value} onChange={e => setParamForm({...paramForm, param_value: e.target.value})} />
                    <button type="submit" style={styles.btnBlack}>Add Key</button>
                </form>
              </div>

              <div style={styles.paramGrid}>
                {parameters.map(p => (
                  <div key={p.id} style={styles.paramCard}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <label style={styles.pLabel}>{p.param_key}</label>
                        <span style={styles.btnDel} onClick={() => deleteParam(p.id)}>×</span>
                    </div>
                    <input style={styles.pInput} defaultValue={p.param_value} onBlur={(e) => updateParam(p.id, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const styles = {
  page: { background: "#f8fafc", minHeight: "100vh", paddingTop: "60px", paddingBottom: "100px" },
  container: { maxWidth: "1450px", margin: "0 auto", padding: "0 20px" },
  heroTitle: { textAlign: "center", color: "#0f172a", fontSize: "36px", fontWeight: "800", marginBottom: "40px" },
  topBar: { background: "#fff", padding: "20px", borderRadius: "16px", display: "flex", gap: "10px", justifyContent: "center", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", marginBottom: "40px", border: "1px solid #e2e8f0" },
  input: { padding: "12px 15px", borderRadius: "8px", border: "1px solid #cbd5e1", flex: 1, fontSize: "14px" },
  inputSmall: { padding: "12px 15px", borderRadius: "8px", border: "1px solid #cbd5e1", width: "90px" },
  select: { padding: "12px 15px", borderRadius: "8px", border: "1px solid #cbd5e1", width: "180px" },
  btnPrimary: { background: "#3b82f6", color: "#fff", padding: "10px 25px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "700" },
  btnBlack: { background: "#0f172a", color: "#fff", padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer" },
  tableWrapper: { background: "#fff", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0,0,0,0.04)", overflow: "hidden", border: '1px solid #e2e8f0' },
  mainTable: { width: "100%", borderCollapse: "collapse", textAlign: "center" },
  thRow: { background: "#f1f5f9" },
  tr: { borderBottom: '1px solid #f1f5f9', height: '60px' },
  td: { padding: '10px', fontSize: '12px' },
  btnManage: { background: "#64748b", color: "#fff", padding: "6px 12px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: '11px' },
  btnMakeFallback: { background: "#fff", color: "#ca8a04", border: "1px solid #ca8a04", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: '11px' },
  btnMakePrimary: { background: "#fff", color: "#16a34a", border: "1px solid #16a34a", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: '11px' },
  badgePrimary: { background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' },
  badgeFallback: { background: '#fef9c3', color: '#854d0e', padding: '4px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' },
  manageCard: { marginTop: "40px", background: "#fff", padding: "35px", borderRadius: "24px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)", border: "1px solid #3b82f6" },
  manageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: '1px solid #f1f5f9', paddingBottom: '20px', marginBottom: '25px' },
  paramGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px" },
  paramCard: { background: "#f1f5f9", padding: "12px", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "5px", textAlign: 'left' },
  pLabel: { fontSize: "11px", fontWeight: "800", color: "#475569", textTransform: "uppercase" },
  pInput: { padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", background: "#fff" },
  btnClose: { background: "#ef4444", color: "#fff", padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold" },
  btnDel: { color: '#ef4444', fontSize: '20px', cursor: 'pointer', fontWeight: 'bold' }
};
