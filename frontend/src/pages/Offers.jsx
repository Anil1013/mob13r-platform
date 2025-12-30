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
    otp_length: 4,
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

  // advertiserId empty => ALL offers
  const fetchOffers = async (advertiserId = "") => {
    try {
      const url = advertiserId
        ? `${API_BASE}/api/offers?advertiser_id=${advertiserId}`
        : `${API_BASE}/api/offers`;

      const res = await fetch(url, { headers: authHeaders });
      const data = await res.json();

      setOffers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch offers failed:", err);
      setOffers([]);
    }
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
    fetchOffers(); // load all offers initially
  }, []);

  {/* TOP BAR : Advertiser + Create Offer */}
<div style={styles.topBar}>
  {/* ADVERTISER SELECT */}
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
      <option key={a.id} value={a.id}>
        {a.name}
      </option>
    ))}
  </select>

  {/* CREATE OFFER INLINE */}
  <form onSubmit={createOffer} style={styles.createRow}>
    <input
      placeholder="Service"
      required
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
      style={{ width: 70 }}
    />

    <input
      placeholder="Cap"
      value={offerForm.daily_cap}
      onChange={(e) =>
        setOfferForm({ ...offerForm, daily_cap: e.target.value })
      }
      style={{ width: 80 }}
    />

    <input
      placeholder="Geo"
      value={offerForm.geo}
      onChange={(e) =>
        setOfferForm({ ...offerForm, geo: e.target.value })
      }
      style={{ width: 70 }}
    />

    <input
      placeholder="Carrier"
      value={offerForm.carrier}
      onChange={(e) =>
        setOfferForm({ ...offerForm, carrier: e.target.value })
      }
      style={{ width: 90 }}
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

    <button>Create</button>
  </form>
</div>

        {/* OFFER TABLE */}
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {[
                  "ID",
                  "Advertiser",
                  "Service",
                  "Geo",
                  "Carrier",
                  "Cap",
                  "Used",
                  "Remain",
                  "Route",
                  "Status",
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
                  <td style={styles.td}>{o.advertiser_name || "-"}</td>
                  <td style={styles.td}>{o.service_name}</td>
                  <td style={styles.td}>{o.geo}</td>
                  <td style={styles.td}>{o.carrier}</td>
                  <td style={styles.td}>{o.daily_cap || "∞"}</td>
                  <td style={styles.td}>{o.today_hits}</td>
                  <td style={styles.td}>{remaining(o)}</td>
                  <td style={styles.td}>{o.service_type}</td>
                  <td style={styles.td}>{getStatusBadge(o)}</td>
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
  page: {
    padding: "60px 30px",
    fontFamily: "Inter, system-ui, Arial",
  },
  topBar: {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 15,
  flexWrap: "wrap",
},

createRow: {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
},

  },
  card: {
    background: "#fff",
    padding: 20,
    marginTop: 15,
    borderRadius: 6,
  },
  inline: {
    display: "flex",
    gap: 10,
    marginBottom: 10,
  },
  tableWrap: {
    marginTop: 15,
    display: "flex",
    justifyContent: "center",
  },
  table: {
    width: "95%",
    borderCollapse: "collapse",
    textAlign: "center",
  },
  th: {
    border: "1px solid #ddd",
    padding: 8,
    background: "#f3f4f6",
    fontWeight: 600,
  },
  td: {
    border: "1px solid #ddd",
    padding: 8,
  },
  badgeActive: { color: "green", fontWeight: 600 },
  badgeCap: { color: "red", fontWeight: 600 },
  badgeFallback: { color: "#ca8a04", fontWeight: 600 },
};
