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

  const getStatusBadge = (o) => { 
if (o.service_type === "FALLBACK") return <span style={styles.badgeFallback}>🟡 Fallback</span>; 
if (o.daily_cap && o.today_hits >= o.daily_cap) return <span style={styles.badgeCap}>🔴 Cap Reached</span>; 
return <span style={styles.badgeActive}>🟢 Active</span>; };

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

          <input placeholder="CPA ($)" style={{ width: 80 }}
            value={offerForm.cpa}
            onChange={(e) =>
              setOfferForm({ ...offerForm, cpa: e.target.value })
            }
          />

          <input placeholder="Cap" style={{ width: 80 }}
            value={offerForm.daily_cap}
            onChange={(e) =>
              setOfferForm({ ...offerForm, daily_cap: e.target.value })
            }
          />

          <input placeholder="Geo" style={{ width: 70 }}
            value={offerForm.geo}
            onChange={(e) =>
              setOfferForm({ ...offerForm, geo: e.target.value })
            }
          />

          <input placeholder="Carrier" style={{ width: 90 }}
            value={offerForm.carrier}
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

                  {/* SERVICE */}
                  <td style={styles.td}>
                    <input
                      defaultValue={o.service_name}
                      onBlur={(e) =>
                        updateOffer(o.id, { service_name: e.target.value })
                      }
                    />
                  </td>

                  {/* CPA */}
                  <td style={styles.td}>
                    <input
                      defaultValue={o.cpa || ""}
                      style={{ width: 70 }}
                      onBlur={(e) =>
                        updateOffer(o.id, { cpa: e.target.value })
                      }
                    />
                  </td>

                  {/* GEO */}
                  <td style={styles.td}>
                    <input
                      defaultValue={o.geo || ""}
                      style={{ width: 60 }}
                      onBlur={(e) =>
                        updateOffer(o.id, { geo: e.target.value })
                      }
                    />
                  </td>

                  {/* CARRIER */}
                  <td style={styles.td}>
                    <input
                      defaultValue={o.carrier || ""}
                      style={{ width: 80 }}
                      onBlur={(e) =>
                        updateOffer(o.id, { carrier: e.target.value })
                      }
                    />
                  </td>

                  {/* CAP */}
                  <td style={styles.td}>
                    <input
                      defaultValue={o.daily_cap || ""}
                      placeholder="∞"
                      style={{ width: 70 }}
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
                  <td style={styles.td}>{o.service_type}</td>

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

        {/* PARAMETERS */}
        {selectedOffer && (
          <div style={styles.card}>
            <h3>Parameters – {selectedOffer.service_name}</h3>

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

/* ---------------- STYLES ---------------- */
const styles = {
  page: { padding: "60px 30px", fontFamily: "Inter, system-ui, Arial" },

  tableWrap: { display: "flex", justifyContent: "center", marginTop: 15 },

  table: {
    width: "95%",
    borderCollapse: "collapse",
    textAlign: "center",
  },

  th: {
    border: "1px solid #ddd",
    padding: 8,
    background: "#f3f4f6",
  },

  td: {
    border: "1px solid #ddd",
    padding: 8,
    verticalAlign: "middle",
  },

  input: {
    width: "100%",
    textAlign: "center",
  },

  inputSmall: {
    width: 70,
    textAlign: "center",
  },

  inputTiny: {
    width: 50,
    textAlign: "center",
  },

  badgePrimary: {
    color: "green",
    fontWeight: 600,
  },

  badgeFallback: {
    color: "#ca8a04",
    fontWeight: 600,
  },
};
