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

  const fetchOffers = async () => {
    const res = await fetch(`${API_BASE}/api/offers`, { headers: authHeaders });
    setOffers(await res.json());
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/advertisers`, { headers: authHeaders }).then(r => r.json()).then(setAdvertisers);
    fetchOffers();
  }, []);

  const updateOffer = async (id, payload) => {
    await fetch(`${API_BASE}/api/offers/${id}`, { method: "PATCH", headers: authHeaders, body: JSON.stringify(payload) });
    fetchOffers();
  };

  const addParam = async (e) => {
    e.preventDefault();
    await fetch(`${API_BASE}/api/offers/${selectedOffer.id}/parameters`, { method: "POST", headers: authHeaders, body: JSON.stringify(paramForm) });
    setParamForm({ param_key: "", param_value: "" });
    const res = await fetch(`${API_BASE}/api/offers/${selectedOffer.id}/parameters`, { headers: authHeaders });
    setParameters(await res.json());
  };

  const updateParam = async (id, val) => {
    await fetch(`${API_BASE}/api/offers/parameters/${id}`, { method: "PATCH", headers: authHeaders, body: JSON.stringify({ param_value: val }) });
  };

  return (
    <>
      <Navbar />
      <div style={styles.page}>
        <div style={styles.container}>
          <h1 style={styles.heroTitle}>Universal Offer Engine</h1>
          
          {/* CREATE FORM - CENTRE ALIGNED */}
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
            <button type="submit" style={styles.btnPrimary}>+ Create New</button>
          </form>

          {/* MAIN TABLE - SYMMETRICAL */}
          <div style={styles.tableWrapper}>
            <table style={styles.mainTable}>
              <thead>
                <tr>
                  <th>ID</th><th>Advertiser</th><th>Service Name</th><th>CPA</th><th>Used</th><th>Control</th>
                </tr>
              </thead>
              <tbody>
                {offers.map(o => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td style={{fontWeight: '700', textAlign: 'left', paddingLeft: '20px'}}>{o.advertiser_name}</td>
                    <td style={{textAlign: 'left'}}>{o.service_name}</td>
                    <td style={{color: '#16a34a', fontWeight: '700'}}>${o.cpa}</td>
                    <td>{o.today_hits}</td>
                    <td>
                      <button style={styles.btnManage} onClick={async () => {
                        setSelectedOffer(o);
                        const res = await fetch(`${API_BASE}/api/offers/${o.id}/parameters`, { headers: authHeaders });
                        setParameters(await res.json());
                      }}>Configure</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* CONFIGURATION PANEL */}
          {selectedOffer && (
            <div style={styles.manageCard}>
              <div style={styles.manageHeader}>
                <div>
                    <h2 style={{margin:0}}>Configuring: <span style={{color: '#3b82f6'}}>{selectedOffer.advertiser_name} - {selectedOffer.service_name}</span></h2>
                    <span style={{fontSize: '12px', color: '#64748b'}}>Auto-saves on leave</span>
                </div>
                <button style={styles.btnClose} onClick={() => setSelectedOffer(null)}>Close</button>
              </div>

              {/* MANUAL ADD - BOX DESIGN */}
              <div style={styles.manualBox}>
                <h4 style={{marginTop: 0, fontSize: '14px', color: '#475569'}}>+ Add New Parameter Key</h4>
                <form onSubmit={addParam} style={{display: 'flex', gap: '10px'}}>
                    <input placeholder="Key Name" style={styles.input} value={paramForm.param_key} onChange={e => setParamForm({...paramForm, param_key: e.target.value})} />
                    <input placeholder="Value" style={styles.input} value={paramForm.param_value} onChange={e => setParamForm({...paramForm, param_value: e.target.value})} />
                    <button type="submit" style={styles.btnBlack}>Add Key</button>
                </form>
              </div>

              {/* PARAMETER LIST - GRID LAYOUT */}
              <div style={styles.paramGrid}>
                {parameters.map(p => (
                  <div key={p.id} style={styles.paramCard}>
                    <label style={styles.pLabel}>{p.param_key}</label>
                    <input 
                      style={styles.pInput} 
                      defaultValue={p.param_value} 
                      onBlur={(e) => updateParam(p.id, e.target.value)} 
                    />
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
  page: { background: "#f8fafc", minHeight: "100vh", paddingTop: "60px", paddingBottom: "60px" },
  container: { maxWidth: "1100px", margin: "0 auto", padding: "0 20px" },
  heroTitle: { textAlign: "center", color: "#0f172a", fontSize: "36px", fontWeight: "800", marginBottom: "40px" },
  topBar: { background: "#fff", padding: "20px", borderRadius: "16px", display: "flex", gap: "10px", justifyContent: "center", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", marginBottom: "40px", border: "1px solid #e2e8f0" },
  input: { padding: "12px 15px", borderRadius: "8px", border: "1px solid #cbd5e1", flex: 1, fontSize: "14px" },
  inputSmall: { padding: "12px 15px", borderRadius: "8px", border: "1px solid #cbd5e1", width: "100px", fontSize: "14px" },
  select: { padding: "12px 15px", borderRadius: "8px", border: "1px solid #cbd5e1", width: "200px", fontSize: "14px" },
  btnPrimary: { background: "#3b82f6", color: "#fff", padding: "10px 25px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "700" },
  btnBlack: { background: "#0f172a", color: "#fff", padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" },
  tableWrapper: { background: "#fff", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0,0,0,0.04)", overflow: "hidden", border: "1px solid #f1f5f9" },
  mainTable: { width: "100%", borderCollapse: "collapse", fontSize: "14px" },
  mainTableTh: { background: "#f1f5f9", padding: "15px", textAlign: "center", color: "#64748b" },
  btnManage: { background: "#3b82f6", color: "#fff", padding: "8px 18px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" },
  manageCard: { marginTop: "40px", background: "#fff", padding: "35px", borderRadius: "24px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)", border: "1px solid #3b82f6" },
  manageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "20px", marginBottom: "25px" },
  manualBox: { background: "#f8fafc", padding: "20px", borderRadius: "12px", marginBottom: "30px", border: "1px dashed #3b82f6" },
  paramGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px" },
  paramCard: { background: "#f1f5f9", padding: "12px", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "5px" },
  pLabel: { fontSize: "11px", fontWeight: "800", color: "#475569", textTransform: "uppercase" },
  pInput: { padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#fff" },
  btnClose: { background: "#ef4444", color: "#fff", padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold" }
};
