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
        <h1>Universal Offer Engine</h1>

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
                  "Revenue ($)","Route","Control","Params"
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
    /* 🔥 defaultValue badal di taaki 0 dikhe */
    defaultValue={o.daily_cap === null ? "" : o.daily_cap}
    placeholder="0" 
    onBlur={(e) => {
      /* 🔥 Empty value ko null ki jagah 0 save karein */
      const val = e.target.value === "" ? 0 : parseInt(e.target.value);
      updateOffer(o.id, { daily_cap: val });
    }}
  />
</td>

                  <td style={styles.td}>{o.today_hits}</td>
                  <td style={styles.td}>{remaining(o)}</td>
                  <td style={styles.td}>{autoRevenue(o)}</td>
                  <td style={styles.td}>{routeBadge(o)}</td>

                  <td style={styles.td}>
                    <button 
                      onClick={() => changeServiceType(o.id, o.service_type === "NORMAL" ? "FALLBACK" : "NORMAL")}
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    >
                      {o.service_type === "NORMAL" ? "Set Fallback" : "Set Primary"}
                    </button>
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

        {/* PARAMETERS & ANTI-FRAUD SECTION */}
        {selectedOffer && (
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Configuring: {selectedOffer.service_name}</h3>
                <button onClick={() => setSelectedOffer(null)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
            </div>

            {/* 🔥 NEW WORKFLOW SECTION ADDED (NO PURANA CODE DELETED) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                <div>
                   <label style={{ fontSize: '12px', fontWeight: 'bold' }}>
                     <input type="checkbox" defaultChecked={selectedOffer.has_antifraud} onChange={e => updateOffer(selectedOffer.id, { has_antifraud: e.target.checked })} /> Enable Anti-Fraud
                   </label>
                   <input placeholder="AF Prep URL" style={{ width: '100%', marginTop: '5px', padding: '6px' }} defaultValue={selectedOffer.af_prepare_url} onBlur={e => updateOffer(selectedOffer.id, { af_prepare_url: e.target.value })} />
                </div>
                <div>
                   <label style={{ fontSize: '12px', fontWeight: 'bold' }}>
                     <input type="checkbox" defaultChecked={selectedOffer.has_status_check} onChange={e => updateOffer(selectedOffer.id, { has_status_check: e.target.checked })} /> Shemaroo Status Check
                   </label>
                   <input placeholder="Status Check URL" style={{ width: '100%', marginTop: '5px', padding: '6px' }} defaultValue={selectedOffer.check_status_url} onBlur={e => updateOffer(selectedOffer.id, { check_status_url: e.target.value })} />
                </div>
                <div>
                   <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Workflow Mode</label>
                   <select style={{ width: '100%', marginTop: '5px', padding: '6px' }} defaultValue={selectedOffer.af_trigger_point} onChange={e => updateOffer(selectedOffer.id, { af_trigger_point: e.target.value })}>
                      <option value="BEFORE_SEND">Pre-Generate Token</option>
                      <option value="AFTER_SEND">Inject Script in Response</option>
                   </select>
                </div>
            </div>

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
                    <td style={{ ...styles.td, textAlign: 'left', fontWeight: 'bold' }}>{p.param_key}</td>
                    <td style={styles.td}>
                        <input 
                            style={{ width: '100%', padding: '4px' }} 
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
                    <td style={styles.td}>
                      <button onClick={() => deleteParameter(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>❌</button>
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

/* ---------------- STYLES (UNCHANGED) ---------------- */
const styles = {
  page: { padding: "60px 30px", fontFamily: "Inter, system-ui, Arial", background: '#f0f2f5', minHeight: '100vh' },
  topBar: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 15, background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  tableWrap: { display: "flex", justifyContent: "center", marginTop: 15, background: '#fff', padding: '10px', borderRadius: '8px' },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "center" },
  th: { borderBottom: "2px solid #eee", padding: 12, background: "#f8fafc", color: '#64748b', fontSize: '13px' },
  td: { borderBottom: "1px solid #eee", padding: 10, textAlign: "center", fontSize: '13px' },
  input: {
    width: "90%",
    textAlign: "center",
    padding: 6,
    border: '1px solid #ddd',
    borderRadius: '4px'
  },
  card: { background: "#fff", padding: 25, marginTop: 20, borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' },
  inline: { display: "flex", gap: 10, marginBottom: 20 },

  badgePrimary: { color: "green", fontWeight: 600, fontSize: '11px' },
  badgeFallback: { color: "#ca8a04", fontWeight: 600, fontSize: '11px' },
  badgeCap: { color: "red", fontWeight: 600, fontSize: '11px' },
};
