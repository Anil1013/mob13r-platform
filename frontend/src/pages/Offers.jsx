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

  const autoRevenue = (o) =>
    o.cpa
      ? `$${(Number(o.cpa) * Number(o.today_hits || 0)).toFixed(2)}`
      : "$0.00";

  const badge = (o) => {
    if (o.daily_cap && o.today_hits >= o.daily_cap)
      return <span style={styles.badgeRed}>Cap</span>;
    if (o.service_type === "FALLBACK")
      return <span style={styles.badgeYellow}>Fallback</span>;
    return <span style={styles.badgeGreen}>Primary</span>;
  };

  return (
    <>
      <Navbar />

      <div style={styles.page}>
        <h2 style={styles.title}>Offers Dashboard</h2>

        {/* CREATE BAR */}
        <form onSubmit={createOffer} style={styles.form}>
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

          <input
            placeholder="Service"
            value={offerForm.service_name}
            onChange={(e) =>
              setOfferForm({ ...offerForm, service_name: e.target.value })
            }
          />

          <input
            placeholder="CPA"
            value={offerForm.cpa}
            onChange={(e) =>
              setOfferForm({ ...offerForm, cpa: e.target.value })
            }
          />

          <input
            placeholder="Cap"
            value={offerForm.daily_cap}
            onChange={(e) =>
              setOfferForm({ ...offerForm, daily_cap: e.target.value })
            }
          />

          <button style={styles.btn}>+ Create</button>
        </form>

        {/* TABLE */}
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Service</th>
                <th>CPA</th>
                <th>Used</th>
                <th>Remain</th>
                <th>Revenue</th>
                <th>Status</th>
                <th>Action</th>
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
                        updateOffer(o.id, { service_name: e.target.value })
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
                  <td>{autoRevenue(o)}</td>
                  <td>{badge(o)}</td>

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

        {/* PARAMETERS */}
        {selectedOffer && (
          <div style={styles.card}>
            <h3>Parameters - {selectedOffer.service_name}</h3>

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

            {parameters.map((p) => (
              <div key={p.id} style={styles.paramRow}>
                {p.param_key} : {p.param_value}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ---------------- STYLES ---------------- */

const styles = {
  page: { padding: "20px", background: "#f1f5f9", minHeight: "100vh" },
  title: { fontSize: "26px", marginBottom: "20px" },

  form: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
  },

  card: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "20px",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  btn: {
    background: "#2563eb",
    color: "#fff",
    padding: "10px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },

  btnSmall: {
    background: "#111",
    color: "#fff",
    padding: "6px 10px",
    borderRadius: "6px",
  },

  badgeGreen: { color: "green" },
  badgeYellow: { color: "orange" },
  badgeRed: { color: "red" },

  paramRow: {
    padding: "5px 0",
    borderBottom: "1px solid #ddd",
  },
};
