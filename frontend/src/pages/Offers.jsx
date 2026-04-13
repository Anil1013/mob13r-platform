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
    has_antifraud: false,
    has_status_check: false,
    af_trigger_point: "BEFORE_SEND",
    encode_headers_base64: false,
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

  /* ---------------- ACTIONS ---------------- */
  const updateOffer = async (id, payload) => {
    await fetch(`${API_BASE}/api/offers/${id}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    fetchOffers();
  };

  const createOffer = async (e) => {
    e.preventDefault();

    const res = await fetch(`${API_BASE}/api/offers`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(offerForm),
    });

    const data = await res.json();
    setOffers((prev) => [data, ...prev]);
  };

  /* ---------------- HELPERS ---------------- */
  const remaining = (o) =>
    !o.daily_cap ? "∞" : Math.max(o.daily_cap - o.today_hits, 0);

  const revenue = (o) =>
    o.cpa
      ? `$${(Number(o.cpa) * Number(o.today_hits || 0)).toFixed(2)}`
      : "$0.00";

  /* ---------------- UI ---------------- */
  return (
    <>
      <Navbar />

      <div style={styles.page}>
        <div style={styles.container}>
          <h2 style={styles.title}>Offers Control Panel</h2>

          {/* CREATE */}
          <form onSubmit={createOffer} style={styles.glassCard}>
            <select
              value={offerForm.advertiser_id}
              onChange={(e) =>
                setOfferForm({ ...offerForm, advertiser_id: e.target.value })
              }
            >
              <option value="">Advertiser</option>
              {advertisers.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            <input placeholder="Service"
              value={offerForm.service_name}
              onChange={(e) =>
                setOfferForm({ ...offerForm, service_name: e.target.value })
              }
            />

            <input placeholder="CPA"
              value={offerForm.cpa}
              onChange={(e) =>
                setOfferForm({ ...offerForm, cpa: e.target.value })
              }
            />

            <input placeholder="Cap"
              value={offerForm.daily_cap}
              onChange={(e) =>
                setOfferForm({ ...offerForm, daily_cap: e.target.value })
              }
            />

            <button style={styles.btn}>Create</button>
          </form>

          {/* TABLE */}
          <div style={styles.glassCard}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Service</th>
                  <th>CPA</th>
                  <th>Used</th>
                  <th>Remain</th>
                  <th>Revenue</th>
                  <th>AF</th>
                  <th>Status</th>
                  <th>Control</th>
                </tr>
              </thead>

              <tbody>
                {offers.map((o) => (
                  <tr key={o.id}>
                    <td>{o.id}</td>

                    <td>
                      <input
                        defaultValue={o.service_name}
                        onBlur={(e) =>
                          updateOffer(o.id, {
                            service_name: e.target.value,
                          })
                        }
                      />
                    </td>

                    <td>
                      <input
                        defaultValue={o.cpa}
                        onBlur={(e) =>
                          updateOffer(o.id, { cpa: e.target.value })
                        }
                      />
                    </td>

                    <td>{o.today_hits}</td>
                    <td>{remaining(o)}</td>
                    <td>{revenue(o)}</td>

                    {/* ANTIFRAUD */}
                    <td>
                      <input
                        type="checkbox"
                        defaultChecked={o.has_antifraud}
                        onChange={(e) =>
                          updateOffer(o.id, {
                            has_antifraud: e.target.checked,
                          })
                        }
                      />
                    </td>

                    <td>
                      {o.service_type === "FALLBACK" ? "Fallback" : "Primary"}
                    </td>

                    <td>
                      <button
                        style={styles.btnSmall}
                        onClick={() => {
                          setSelectedOffer(o);
                          fetchParameters(o.id);
                        }}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ADVANCED PANEL */}
          {selectedOffer && (
            <div style={styles.glassCard}>
              <h3>{selectedOffer.service_name}</h3>

              <input
                placeholder="AF URL"
                defaultValue={selectedOffer.af_prepare_url}
                onBlur={(e) =>
                  updateOffer(selectedOffer.id, {
                    af_prepare_url: e.target.value,
                  })
                }
              />

              <input
                placeholder="PIN SEND URL"
                defaultValue={selectedOffer.pin_send_url}
                onBlur={(e) =>
                  updateOffer(selectedOffer.id, {
                    pin_send_url: e.target.value,
                  })
                }
              />

              <input
                placeholder="PIN VERIFY URL"
                defaultValue={selectedOffer.pin_verify_url}
                onBlur={(e) =>
                  updateOffer(selectedOffer.id, {
                    pin_verify_url: e.target.value,
                  })
                }
              />

              {/* PARAMETERS */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await fetch(
                    `${API_BASE}/api/offers/${selectedOffer.id}/parameters`,
                    {
                      method: "POST",
                      headers: authHeaders,
                      body: JSON.stringify(paramForm),
                    }
                  );
                  fetchParameters(selectedOffer.id);
                }}
              >
                <input
                  placeholder="key"
                  value={paramForm.param_key}
                  onChange={(e) =>
                    setParamForm({
                      ...paramForm,
                      param_key: e.target.value,
                    })
                  }
                />
                <input
                  placeholder="value"
                  value={paramForm.param_value}
                  onChange={(e) =>
                    setParamForm({
                      ...paramForm,
                      param_value: e.target.value,
                    })
                  }
                />
                <button>Add</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ================= GLASS UI ================= */

const styles = {
  page: {
    background: "linear-gradient(135deg,#0f172a,#1e293b)",
    minHeight: "100vh",
    paddingTop: "80px",
  },

  container: {
    maxWidth: "1200px",
    margin: "0 auto",
  },

  title: {
    color: "#fff",
    textAlign: "center",
    marginBottom: "30px",
  },

  glassCard: {
    backdropFilter: "blur(20px)",
    background: "rgba(255,255,255,0.1)",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "20px",
    color: "#fff",
  },

  table: {
    width: "100%",
    color: "#fff",
  },

  btn: {
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    padding: "10px",
    borderRadius: "8px",
  },

  btnSmall: {
    background: "#111",
    color: "#fff",
    padding: "6px 10px",
    borderRadius: "6px",
  },
};
