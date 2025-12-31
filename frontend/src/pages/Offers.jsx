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
    setOffers(await res.json());
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
  const updateOffer = async (id, payload) => {
    await fetch(`${API_BASE}/api/offers/${id}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    fetchOffers(offerForm.advertiser_id);
  };

  /* ---------------- PROMOTE / DEMOTE ---------------- */
  const changeServiceType = async (id, service_type) => {
    await fetch(`${API_BASE}/api/offers/${id}/service-type`, {
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
    `$${(Number(o.cpa || 0) * Number(o.today_hits || 0)).toFixed(2)}`;

  const getRouteBadge = (o) =>
    o.service_type === "FALLBACK" ? (
      <span style={styles.badgeFallback}>🟡 Fallback</span>
    ) : (
      <span style={styles.badgePrimary}>🟢 Primary</span>
    );

  /* ---------------- UI ---------------- */
  return (
    <>
      <Navbar />

      <div style={styles.page}>
        <h1>Offers</h1>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {[
                  "ID",
                  "Advertiser",
                  "Service",
                  "CPA ($)",
                  "Geo",
                  "Carrier",
                  "Cap",
                  "Used",
                  "Remain",
                  "Revenue ($)",
                  "Route",
                  "Control",
                  "Params",
                ].map((h) => (
                  <th key={h} style={styles.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {offers.map((o) => (
                <tr key={o.id}>
                  <td style={styles.td}>{o.id}</td>
                  <td style={styles.td}>{o.advertiser_name}</td>

                  <td style={styles.td}>
                    <input
                      defaultValue={o.service_name}
                      style={styles.input}
                      onBlur={(e) =>
                        updateOffer(o.id, { service_name: e.target.value })
                      }
                    />
                  </td>

                  <td style={styles.td}>
                    <input
                      defaultValue={o.cpa || ""}
                      style={styles.inputSmall}
                      onBlur={(e) =>
                        updateOffer(o.id, { cpa: e.target.value })
                      }
                    />
                  </td>

                  <td style={styles.td}>
                    <input
                      defaultValue={o.geo}
                      style={styles.inputTiny}
                      onBlur={(e) =>
                        updateOffer(o.id, { geo: e.target.value })
                      }
                    />
                  </td>

                  <td style={styles.td}>
                    <input
                      defaultValue={o.carrier}
                      style={styles.inputSmall}
                      onBlur={(e) =>
                        updateOffer(o.id, { carrier: e.target.value })
                      }
                    />
                  </td>

                  <td style={styles.td}>
                    <input
                      defaultValue={o.daily_cap || ""}
                      style={styles.inputSmall}
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

                  <td style={styles.td}>{getRouteBadge(o)}</td>

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
                    <button
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
