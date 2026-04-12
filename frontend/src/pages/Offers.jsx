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
    // Universal Workflow Defaults
    has_antifraud: false,
    has_status_check: false,
    af_trigger_point: "BEFORE_SEND",
    encode_headers_base64: false
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

  /* ---------------- UPDATE OFFER ---------------- */
  const updateOffer = async (offerId, payload) => {
    await fetch(`${API_BASE}/api/offers/${offerId}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    fetchOffers(offerForm.advertiser_id);
  };

  /* ---------------- CREATE OFFER ---------------- */
  const createOffer = async (e) => {
    e.preventDefault();

    const res = await fetch(`${API_BASE}/api/offers`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(offerForm),
    });

    const data = await res.json();
    setOffers((prev) => [data, ...prev]);

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

  /* ---------------- PARAMETERS ---------------- */
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
    await fetch(
      `${API_BASE}/api/offers/parameters/${id}`,
      { method: "DELETE", headers: authHeaders }
    );
    fetchParameters(selectedOffer.id);
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

  /* ---------------- HELPERS ---------------- */
  const remaining = (o) =>
    !o.daily_cap ? "∞" : Math.max(o.daily_cap - o.today_hits, 0);

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

      <div style={styles.page}>
        <h1>Offers</h1>

        {/* CREATE BAR */}
        <form onSubmit={createOffer} style={styles.topBar}>
          <select
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

          <input placeholder="Service" required
            value={offerForm.service_name}
            onChange={(e) =>
              setOfferForm({ ...offerForm, service_name: e.target.value })
            }
          />

          <input placeholder="CPA ($)" value={offerForm.cpa}
            onChange={(e) =>
              setOfferForm({ ...offerForm, cpa: e.target.value })
            }
          />

          <input placeholder="Cap" value={offerForm.daily_cap}
            onChange={(e) =>
              setOfferForm({ ...offerForm, daily_cap: e.target.value })
            }
          />

          <input placeholder="Geo" value={offerForm.geo}
            onChange={(e) =>
              setOfferForm({ ...offerForm, geo: e.target.value })
            }
          />

          <input placeholder="Carrier" value={offerForm.carrier}
            onChange={(e) =>
              setOfferForm({ ...offerForm, carrier: e.target.value })
            }
          />

          <select
            value={offerForm.service_type}
            onChange={(e) =>
              setOfferForm({ ...offerForm, service_type: e.target.value })
            }
          >
            <option value="NORMAL">Primary</option>
            <option value="FALLBACK">Fallback</option>
          </select>

          <button type="submit">Create</button>
        </form>

        {/* OFFER TABLE */}
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {[
                  "ID","Advertiser","Service","CPA ($)",
                  "Geo","Carrier","Cap","Used","Remain",
                  "Revenue ($)","Route","Workflow","Control","Params"
                ].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {offers.map(o => (
                <tr key={o.id}>
                  <td style={styles.td}>{o.id}</td>
                  <td style={styles.td}>{o.advertiser_name || "-"}</td>

                  <td style={styles.td}>
                    <input
                      style={styles.input}
                      defaultValue={o.service_name}
                      onBlur={(e) =>
                        updateOffer(o.id, { service_name: e.target.value })
                      }
                    />
                  </td>

                  <td style={styles.td}>
                    <input
                      style={styles.input}
                      defaultValue={o.cpa || ""}
                      onBlur={(e) =>
                        updateOffer(o.id, { cpa: e.target.value })
                      }
                    />
                  </td>

                  <td style={styles.td}>
                    <input
                      style={styles.input}
                      defaultValue={o.geo || ""}
                      onBlur={(e) =>
                        updateOffer(o.id, { geo: e.target.value })
                      }
                    />
                  </td>

                  <td style={styles.td}>
                    <input
                      style={styles.input}
                      defaultValue={o.carrier || ""}
                      onBlur={(e) =>
                        updateOffer(o.id, { carrier: e.target.value })
                      }
                    />
                  </td>

                  <td style={styles.td}>
                    <input
                      style={styles.input}
                      defaultValue={o.daily_cap || ""}
                      placeholder="∞"
                      onBlur={(e) =>
                        updateOffer(o.id, {
                          daily_cap: e.target.value || null,
                        })
                      }
                    />
                  </td>

                  <td style={styles.td}>{o.today_hits}</td>
                  <td style={styles.td}>{remaining(o)}</td>
                  <td style={styles.td}>{autoRevenue(o)}</td>
                  <td style={styles.td}>{routeBadge(o)}</td>

                  {/* ⚙️ WORKFLOW CONFIG CELL */}
                  <td style={styles.td}>
                    <div style={{ display: 'flex', flexDirection: 'column', fontSize: '10px', textAlign: 'left' }}>
                      <label><input type="checkbox" defaultChecked={o.has_antifraud} onChange={e => updateOffer(o.id, { has_antifraud: e.target.checked })} /> AF</label>
                      <label><input type="checkbox" defaultChecked={o.has_status_check} onChange={e => updateOffer(o.id, { has_status_check: e.target.checked })} /> Status</label>
                      <label><input type="checkbox" defaultChecked={o.encode_headers_base64} onChange={e => updateOffer(o.id, { encode_headers_base64: e.target.checked })} /> B64 Head</label>
                    </div>
                  </td>

                  <td style={styles.td}>
                    {o.service_type === "NORMAL" ? (
                      <button onClick={() => changeServiceType(o.id, "FALLBACK")}>
                        Make Fallback
                      </button>
                    ) : (
                      <button onClick={() => changeServiceType(o.id, "NORMAL")}>
                        Make Primary
                      </button>
                    )}
                  </td>

                  <td style={styles.td}>
                    <button onClick={() => {
                      setSelectedOffer(o);
                      fetchParameters(o.id);
                    }}>
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 🛠️ ADVANCED UNIVERSAL SETTINGS */}
        {selectedOffer && (
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
               <h3>Universal Engine Config – {selectedOffer.service_name}</h3>
               <button onClick={() => setSelectedOffer(null)}>Close</button>
            </div>

            {/* Workflow URL Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
               <div>
                  <label style={styles.label}>Anti-Fraud Prep URL (#HEADERS_B64#)</label>
                  <input style={styles.wideInput} defaultValue={selectedOffer.af_prepare_url} onBlur={e => updateOffer(selectedOffer.id, { af_prepare_url: e.target.value })} />
               </div>
               <div>
                  <label style={styles.label}>Status Check URL (#MSISDN#)</label>
                  <input style={styles.wideInput} defaultValue={selectedOffer.check_status_url} onBlur={e => updateOffer(selectedOffer.id, { check_status_url: e.target.value })} />
               </div>
               <div>
                  <label style={styles.label}>PIN Send URL (#MSISDN#, #TXID#, #AF_ID#)</label>
                  <input style={styles.wideInput} defaultValue={selectedOffer.pin_send_url} onBlur={e => updateOffer(selectedOffer.id, { pin_send_url: e.target.value })} />
               </div>
               <div>
                  <label style={styles.label}>PIN Verify URL (#OTP#, #TXID#)</label>
                  <input style={styles.wideInput} defaultValue={selectedOffer.pin_verify_url} onBlur={e => updateOffer(selectedOffer.id, { pin_verify_url: e.target.value })} />
               </div>
            </div>

            <hr />

            <h3>Parameters (Legacy / Key-Value)</h3>
            <form onSubmit={addParameter} style={styles.inline}>
              <input
                placeholder="param_key"
                value={paramForm.param_key}
                onChange={(e) =>
                  setParamForm({ ...paramForm, param_key: e.target.value })
                }
              />
              <input
                placeholder="param_value"
                value={paramForm.param_value}
                onChange={(e) =>
                  setParamForm({ ...paramForm, param_value: e.target.value })
                }
              />
              <button>Add</button>
            </form>

            <table style={styles.table}>
              <tbody>
                {parameters.map((p) => (
                  <tr key={p.id}>
                    <td style={styles.td}>{p.param_key}</td>
                    <td style={styles.td}>{p.param_value}</td>
                    <td style={styles.td}>
                      <button onClick={() => deleteParameter(p.id)}>❌</button>
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
  page: { background: "#f8fafc", minHeight: "100vh", paddingTop: "60px", paddingBottom: "100px" },
  container: { maxWidth: "1350px", margin: "0 auto", padding: "0 20px" },
  heroTitle: { textAlign: "center", color: "#0f172a", fontSize: "36px", fontWeight: "800", marginBottom: "40px" },
  topBar: { background: "#fff", padding: "20px", borderRadius: "16px", display: "flex", gap: "10px", justifyContent: "center", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", marginBottom: "40px", border: "1px solid #e2e8f0" },
  input: { padding: "12px 15px", borderRadius: "8px", border: "1px solid #cbd5e1", flex: 1, fontSize: "14px" },
  inputSmall: { padding: "12px 15px", borderRadius: "8px", border: "1px solid #cbd5e1", width: "90px" },
  select: { padding: "12px 15px", borderRadius: "8px", border: "1px solid #cbd5e1", width: "180px" },
  btnPrimary: { background: "#3b82f6", color: "#fff", padding: "10px 25px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "700" },
  btnBlack: { background: "#0f172a", color: "#fff", padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" },
  tableWrapper: { background: "#fff", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0,0,0,0.04)", overflow: "hidden" },
  mainTable: { width: "100%", borderCollapse: "collapse", textAlign: "center" },
  thRow: { background: "#f1f5f9" },
  tr: { borderBottom: '1px solid #f1f5f9', height: '60px' },
  td: { padding: '10px', fontSize: '13px' },
  btnManage: { background: "#3b82f6", color: "#fff", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" },
  manageCard: { marginTop: "40px", background: "#fff", padding: "35px", borderRadius: "24px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)", border: "1px solid #3b82f6" },
  manageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: '1px solid #f1f5f9', paddingBottom: '20px', marginBottom: '25px' },
  workflowGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' },
  workflowItem: { display: 'flex', flexDirection: 'column', gap: '8px' },
  checkLabel: { fontSize: '13px', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' },
  workflowInput: { padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' },
  manualBox: { background: "#f8fafc", padding: "20px", borderRadius: "12px", marginBottom: "30px", border: "1px dashed #3b82f6" },
  paramGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px" },
  paramCard: { background: "#f1f5f9", padding: "12px", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "5px", textAlign: 'left' },
  pLabel: { fontSize: "11px", fontWeight: "800", color: "#475569", textTransform: "uppercase" },
  pInput: { padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", background: "#fff" },
  btnClose: { background: "#ef4444", color: "#fff", padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold" }
};
