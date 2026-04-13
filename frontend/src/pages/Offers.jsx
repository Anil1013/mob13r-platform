import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

const API_BASE = "https://backend.mob13r.com";

export default function Offers() {
  const token = localStorage.getItem("token");

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

  /* ---------------- UPDATE ---------------- */
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

  /* ---------------- SERVICE TYPE ---------------- */
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
    o.cpa
      ? `$${(Number(o.cpa) * Number(o.today_hits || 0)).toFixed(2)}`
      : "$0.00";

  const routeBadge = (o) => {
    if (o.daily_cap && o.today_hits >= o.daily_cap) {
      return <span style={styles.badgeCap}>Cap Reached</span>;
    }
    if (o.service_type === "FALLBACK") {
      return <span style={styles.badgeFallback}>Fallback</span>;
    }
    return <span style={styles.badgePrimary}>Primary</span>;
  };

  /* ---------------- UI ---------------- */
  return (
    <>
      <Navbar />

      <div style={styles.page}>
        <h1 style={styles.heading}>Offers</h1>

        {/* CREATE */}
        <form onSubmit={createOffer} style={styles.glassBar}>
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

          <input placeholder="CPA" value={offerForm.cpa}
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

        {/* TABLE */}
        <div style={styles.tableWrap}>
          <table style={styles.glassTable}>
            <thead>
              <tr>
                {[
                  "ID","Advertiser","Service","CPA",
                  "Geo","Carrier","Cap","Used","Remain",
                  "Revenue","Route","Control","Params"
                ].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {offers.map(o => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.advertiser_name || "-"}</td>

                  <td>
                    <input defaultValue={o.service_name}
                      onBlur={(e) =>
                        updateOffer(o.id, { service_name: e.target.value })
                      }
                    />
                  </td>

                  <td>
                    <input defaultValue={o.cpa || ""}
                      onBlur={(e) =>
                        updateOffer(o.id, { cpa: e.target.value })
                      }
                    />
                  </td>

                  <td>
                    <input defaultValue={o.geo || ""}
                      onBlur={(e) =>
                        updateOffer(o.id, { geo: e.target.value })
                      }
                    />
                  </td>

                  <td>
                    <input defaultValue={o.carrier || ""}
                      onBlur={(e) =>
                        updateOffer(o.id, { carrier: e.target.value })
                      }
                    />
                  </td>

                  <td>
                    <input defaultValue={o.daily_cap || ""}
                      onBlur={(e) =>
                        updateOffer(o.id, {
                          daily_cap: e.target.value || null,
                        })
                      }
                    />
                  </td>

                  <td>{o.today_hits}</td>
                  <td>{remaining(o)}</td>
                  <td>{autoRevenue(o)}</td>
                  <td>{routeBadge(o)}</td>

                  <td>
                    {o.service_type === "NORMAL" ? (
                      <button onClick={() => changeServiceType(o.id, "FALLBACK")}>
                        → Fallback
                      </button>
                    ) : (
                      <button onClick={() => changeServiceType(o.id, "NORMAL")}>
                        → Primary
                      </button>
                    )}
                  </td>

                  <td>
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
          <div style={styles.glassCard}>
            <h3>{selectedOffer.service_name} Params</h3>

            <form onSubmit={addParameter} style={styles.inline}>
              <input placeholder="key"
                value={paramForm.param_key}
                onChange={(e) =>
                  setParamForm({ ...paramForm, param_key: e.target.value })
                }
              />
              <input placeholder="value"
                value={paramForm.param_value}
                onChange={(e) =>
                  setParamForm({ ...paramForm, param_value: e.target.value })
                }
              />
              <button>Add</button>
            </form>

            {parameters.map(p => (
              <div key={p.id} style={styles.paramRow}>
                {p.param_key} = {p.param_value}
                <button onClick={() => deleteParameter(p.id)}>❌</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ---------------- STYLES (GLASS) ---------------- */
const glass = {
  background: "rgba(255,255,255,0.08)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "16px",
};

const styles = {
  page: {
    padding: 30,
    background: "linear-gradient(135deg,#0f172a,#1e293b)",
    minHeight: "100vh",
    color: "white",
  },
  heading: { textAlign: "center", marginBottom: 20 },

  glassBar: {
    ...glass,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    padding: 15,
    justifyContent: "center",
  },

  tableWrap: { marginTop: 20, display: "flex", justifyContent: "center" },

  glassTable: {
    ...glass,
    width: "95%",
    borderCollapse: "collapse",
    textAlign: "center",
  },

  glassCard: {
    ...glass,
    marginTop: 20,
    padding: 20,
  },

  inline: { display: "flex", gap: 10 },

  paramRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 5,
  },

  badgePrimary: { color: "#22c55e" },
  badgeFallback: { color: "#facc15" },
  badgeCap: { color: "#ef4444" },
};
