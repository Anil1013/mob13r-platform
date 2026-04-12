import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

const API_BASE = "https://backend.mob13r.com";

export default function Offers() {
  const token = localStorage.getItem("token");
  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const [advertisers, setAdvertisers] = useState([]);
  const [offers, setOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [parameters, setParameters] = useState([]);
  
  const [offerForm, setOfferForm] = useState({
    advertiser_id: "", service_name: "", cpa: "", daily_cap: "", geo: "", carrier: "", 
    service_type: "NORMAL", has_antifraud: false, af_prepare_url: ""
  });

  const [paramForm, setParamForm] = useState({ param_key: "", param_value: "" });

  const fetchOffers = (advId = "") => {
    fetch(`${API_BASE}/api/offers${advId ? `?advertiser_id=${advId}` : ""}`, { headers: authHeaders })
      .then(r => r.json()).then(data => setOffers(Array.isArray(data) ? data : []));
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/advertisers`, { headers: authHeaders }).then(r => r.json()).then(setAdvertisers);
    fetchOffers();
  }, []);

  const createOffer = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/api/offers`, { method: "POST", headers: authHeaders, body: JSON.stringify(offerForm) });
    if (res.ok) fetchOffers(offerForm.advertiser_id);
  };

  const updateParam = async (id, value) => {
    await fetch(`${API_BASE}/api/offers/parameters/${id}`, {
      method: "PATCH", headers: authHeaders, body: JSON.stringify({ param_value: value })
    });
  };

  const selectOffer = (o) => {
    setSelectedOffer(o);
    fetch(`${API_BASE}/api/offers/${o.id}/parameters`, { headers: authHeaders })
      .then(r => r.json()).then(setParameters);
  };

  return (
    <>
      <Navbar />
      <div style={styles.page}>
        <h1 style={styles.title}>Offer Management Dashboard</h1>

        {/* CREATE OFFER FORM */}
        <form onSubmit={createOffer} style={styles.glassCard}>
          <div style={styles.grid}>
            <select style={styles.select} value={offerForm.advertiser_id} onChange={e => setOfferForm({...offerForm, advertiser_id: e.target.value})} required>
              <option value="">Select Advertiser</option>
              {advertisers.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <input style={styles.input} placeholder="Service Name" onChange={e => setOfferForm({...offerForm, service_name: e.target.value})} />
            <input style={styles.input} placeholder="CPA ($)" onChange={e => setOfferForm({...offerForm, cpa: e.target.value})} />
            <input style={styles.input} placeholder="Geo" onChange={e => setOfferForm({...offerForm, geo: e.target.value})} />
            <div style={styles.checkboxGroup}>
              <input type="checkbox" onChange={e => setOfferForm({...offerForm, has_antifraud: e.target.checked})} />
              <label>Anti-Fraud</label>
            </div>
            <button type="submit" style={styles.btnCreate}>Create Offer</button>
          </div>
          {offerForm.has_antifraud && (
            <input style={{...styles.input, width: '100%', marginTop: '10px'}} placeholder="AF Prepare URL (Korek/Asiacell Style)" 
              onChange={e => setOfferForm({...offerForm, af_prepare_url: e.target.value})} />
          )}
        </form>

        {/* OFFERS TABLE */}
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th>ID</th><th>Service</th><th>Route</th><th>Anti-Fraud</th><th>Control</th>
              </tr>
            </thead>
            <tbody>
              {offers.map(o => (
                <tr key={o.id} style={styles.trRow}>
                  <td>{o.id}</td>
                  <td>{o.service_name} ({o.geo})</td>
                  <td><span style={o.service_type==='NORMAL'?styles.badgeActive:styles.badgeFallback}>{o.service_type}</span></td>
                  <td>{o.has_antifraud ? "🛡️ Yes" : "❌ No"}</td>
                  <td><button onClick={() => selectOffer(o)} style={styles.btnManage}>Configure Params</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PARAMETERS SECTION (Visible when offer is selected) */}
        {selectedOffer && (
          <div style={styles.paramSection}>
            <div style={styles.paramHeader}>
              <h3>⚙️ Parameters: {selectedOffer.service_name}</h3>
              <button onClick={() => setSelectedOffer(null)} style={styles.btnClose}>Close</button>
            </div>
            <div style={styles.paramGrid}>
              {parameters.map(p => (
                <div key={p.id} style={styles.paramItem}>
                  <label style={styles.label}>{p.param_key}</label>
                  <input 
                    defaultValue={p.param_value} 
                    onBlur={(e) => updateParam(p.id, e.target.value)}
                    style={p.param_key.includes('pin_') ? styles.apiInput : styles.paramInput}
                    placeholder="Enter advertiser value..."
                  />
                </div>
              ))}
            </div>
            <div style={styles.addParam}>
                <input placeholder="New Key" onChange={e => setParamForm({...paramForm, param_key: e.target.value})} style={styles.smallInput} />
                <input placeholder="Value" onChange={e => setParamForm({...paramForm, param_value: e.target.value})} style={styles.smallInput} />
                <button style={styles.btnAdd} onClick={async () => {
                  await fetch(`${API_BASE}/api/offers/${selectedOffer.id}/parameters`, {method:'POST', headers:authHeaders, body:JSON.stringify(paramForm)});
                  selectOffer(selectedOffer);
                }}>Add Custom Param</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  page: { padding: '40px', backgroundColor: '#f4f7fe', minHeight: '100vh', fontFamily: 'Inter, sans-serif' },
  title: { fontSize: '24px', fontWeight: '800', color: '#2b3674', marginBottom: '25px' },
  glassCard: { background: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '30px' },
  grid: { display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' },
  input: { padding: '12px', borderRadius: '12px', border: '1px solid #e0e5f2', background: '#f4f7fe' },
  select: { padding: '12px', borderRadius: '12px', border: '1px solid #e0e5f2', backgroundColor: '#f4f7fe' },
  checkboxGroup: { display: 'flex', gap: '8px', alignItems: 'center', fontWeight: '600', color: '#2b3674' },
  btnCreate: { background: '#4318ff', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' },
  tableWrapper: { background: 'white', borderRadius: '20px', padding: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { textAlign: 'left', color: '#a3aed0', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #e0e5f2' },
  trRow: { borderBottom: '1px solid #f4f7fe', height: '60px', color: '#2b3674', fontWeight: '600' },
  badgeActive: { color: '#05cd99', background: '#e6fff5', padding: '4px 12px', borderRadius: '8px', fontSize: '12px' },
  badgeFallback: { color: '#ee5d50', background: '#fff5f4', padding: '4px 12px', borderRadius: '8px', fontSize: '12px' },
  btnManage: { background: '#f4f7fe', border: 'none', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', color: '#4318ff', fontWeight: 'bold' },
  
  paramSection: { marginTop: '30px', background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' },
  paramHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  paramGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' },
  paramItem: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '12px', color: '#a3aed0', fontWeight: 'bold' },
  paramInput: { padding: '10px', borderRadius: '10px', border: '1px solid #e0e5f2' },
  apiInput: { padding: '10px', borderRadius: '10px', border: '2px solid #4318ff', background: '#f4f7fe' },
  addParam: { marginTop: '25px', display: 'flex', gap: '10px', borderTop: '1px solid #eee', paddingTop: '20px' },
  smallInput: { padding: '10px', borderRadius: '8px', border: '1px solid #ddd' },
  btnAdd: { background: '#05cd99', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer' },
  btnClose: { background: '#ee5d50', color: 'white', border: 'none', padding: '5px 15px', borderRadius: '8px', cursor: 'pointer' }
};
