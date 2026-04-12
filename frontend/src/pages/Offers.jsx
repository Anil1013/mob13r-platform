import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

const API_BASE = "https://backend.mob13r.com";

export default function Offers() {
  const token = localStorage.getItem("token");
  const [advertisers, setAdvertisers] = useState([]);
  const [offers, setOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [parameters, setParameters] = useState([]);
  const [newKey, setNewKey] = useState({ key: "", value: "" });

  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchOffers = async () => {
    const res = await fetch(`${API_BASE}/api/offers`, { headers: authHeaders });
    setOffers(await res.json());
  };

  const fetchParams = async (id) => {
    const res = await fetch(`${API_BASE}/api/offers/${id}/parameters`, { headers: authHeaders });
    setParameters(await res.json());
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/advertisers`, { headers: authHeaders }).then(r => r.json()).then(setAdvertisers);
    fetchOffers();
  }, []);

  const handleAddParam = async () => {
    if (!newKey.key) return alert("Key is required");
    await fetch(`${API_BASE}/api/offers/${selectedOffer.id}/parameters`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ param_key: newKey.key, param_value: newKey.value })
    });
    setNewKey({ key: "", value: "" });
    fetchParams(selectedOffer.id);
  };

  const deleteParam = async (id) => {
    if (window.confirm("Delete this key?")) {
      await fetch(`${API_BASE}/api/offers/parameters/${id}`, { method: "DELETE", headers: authHeaders });
      fetchParams(selectedOffer.id);
    }
  };

  const updateParam = async (id, val) => {
    await fetch(`${API_BASE}/api/offers/parameters/${id}`, { method: "PATCH", headers: authHeaders, body: JSON.stringify({ param_value: val }) });
  };

  return (
    <>
      <Navbar />
      <div style={styles.page}>
        <div style={styles.container}>
          <h1 style={styles.title}>Universal Offer Engine</h1>
          
          <div style={styles.card}>
            <table style={styles.mainTable}>
              <thead style={styles.thead}>
                <tr>
                  <th>ID</th><th>Advertiser</th><th>Service</th><th>CPA</th><th>Used</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {offers.map(o => (
                  <tr key={o.id} style={styles.tr}>
                    <td>{o.id}</td>
                    <td style={{fontWeight: '600'}}>{o.advertiser_name}</td>
                    <td>{o.service_name}</td>
                    <td style={{color: '#16a34a'}}>${o.cpa}</td>
                    <td>{o.today_hits}</td>
                    <td>
                      <button style={styles.btnManage} onClick={() => { setSelectedOffer(o); fetchParams(o.id); }}>Configure</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedOffer && (
            <div style={styles.manageSection}>
              <div style={styles.manageHeader}>
                <div>
                    <h2 style={{margin:0, color: '#1e293b'}}>Configuring: {selectedOffer.service_name}</h2>
                    <p style={{fontSize: '12px', color: '#64748b'}}>Changes are saved automatically on leave</p>
                </div>
                <button style={styles.btnClose} onClick={() => setSelectedOffer(null)}>Close</button>
              </div>

              {/* SECTION: ADD NEW KEY */}
              <div style={styles.addBox}>
                <h4 style={{marginTop: 0, fontSize: '14px'}}>+ Add New Manual Parameter</h4>
                <div style={{display: 'flex', gap: '10px'}}>
                    <input placeholder="New Key (e.g. tracking_id)" style={styles.input} value={newKey.key} onChange={e => setNewKey({...newKey, key: e.target.value})} />
                    <input placeholder="Value" style={styles.input} value={newKey.value} onChange={e => setNewKey({...newKey, value: e.target.value})} />
                    <button style={styles.btnAdd} onClick={handleAddParam}>Add Key</button>
                </div>
              </div>

              {/* LIST OF ALL KEYS */}
              <div style={styles.paramGrid}>
                {parameters.map(p => (
                  <div key={p.id} style={styles.paramCard}>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                        <label style={styles.paramLabel}>{p.param_key}</label>
                        <span style={styles.btnDel} onClick={() => deleteParam(p.id)}>×</span>
                    </div>
                    <input 
                      style={styles.paramInput} 
                      placeholder={p.param_key === 'msisdn' ? '{msisdn}' : 'Enter value...'}
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
  page: { background: "#f8fafc", minHeight: "100vh", paddingTop: "80px" },
  container: { maxWidth: "1200px", margin: "0 auto", padding: "20px" },
  title: { color: "#0f172a", fontSize: "32px", marginBottom: "30px", fontWeight: "800", textAlign: 'center' },
  card: { background: "#fff", borderRadius: "16px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", overflow: "hidden", border: '1px solid #e2e8f0' },
  mainTable: { width: "100%", borderCollapse: "collapse" },
  thead: { background: '#f1f5f9' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  manageSection: { marginTop: "40px", background: "#fff", padding: "35px", borderRadius: "20px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.2)", border: "1px solid #3b82f6" },
  manageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" },
  addBox: { background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '30px', border: '1px dashed #cbd5e1' },
  paramGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" },
  paramCard: { background: "#fff", padding: "15px", borderRadius: "12px", border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' },
  paramLabel: { fontSize: "12px", fontWeight: "700", color: "#475569", letterSpacing: '0.5px' },
  paramInput: { padding: "10px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "13px", outline: 'none', background: '#f1f5f9' },
  input: { padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", flex: 1, fontSize: '13px' },
  btnAdd: { background: "#0f172a", color: "#fff", padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" },
  btnManage: { background: "#3b82f6", color: "#fff", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: '600' },
  btnClose: { background: "#64748b", color: "#fff", padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer" },
  btnDel: { color: '#ef4444', cursor: 'pointer', fontSize: '20px', fontWeight: 'bold' }
};
