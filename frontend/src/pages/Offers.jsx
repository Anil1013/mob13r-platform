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

  // 🔥 advertiserId empty → ALL offers
  const fetchOffers = async (advertiserId) => {
  try {
    const url = advertiserId
      ? `${API_BASE}/api/offers?advertiser_id=${advertiserId}`
      : `${API_BASE}/api/offers`;

    const res = await fetch(url, { headers: authHeaders });
    const data = await res.json();

    // 🔐 SAFETY CHECK
    if (Array.isArray(data)) {
      setOffers(data);
    } else {
      console.warn("Offers API returned non-array:", data);
      setOffers([]);
    }
  } catch (err) {
    console.error("Failed to fetch offers:", err);
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
    fetchOffers(); // 🔥 page load → all offers
  }, []);

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

  /* ---------------- MANUAL PROMOTE / DEMOTE ---------------- */
  const changeServiceType = async (offerId, service_type) => {
    await fetch(`${API_BASE}/api/offers/${offerId}/service-type`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ service_type }),
    });

    fetchOffers(offerForm.advertiser_id);
  };

  /* ---------------- HELPERS ---------------- */
  const getStatusBadge = (o) => {
    if (o.service_type === "FALLBACK") {
      return <span style={styles.badgeFallback}>🟡 Fallback</span>;
    }

    if (o.daily_cap && o.today_hits >= o.daily_cap) {
      return <span style={styles.badgeCap}>🔴 Cap Reached</span>;
    }

    return <span style={styles.badgeActive}>🟢 Active</span>;
  };

  const remaining = (o) => {
    if (!o.daily_cap) return "∞";
    return Math.max(o.daily_cap - o.today_hits, 0);
  };

  /* ---------------- UI ---------------- */
  return (
    <>
      <Navbar />

      <div style={styles.page}>
        <h1>Offers</h1>

        {/* SELECT ADVERTISER */}
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

        {/* CREATE OFFER */}
        <form onSubmit={createOffer} style={styles.card}>
          <h3>Create Offer</h3>

          <input
            placeholder="Service Name"
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
          />

          <input
            placeholder="Daily Cap"
            value={offerForm.daily_cap}
            onChange={(e) =>
              setOfferForm({ ...offerForm, daily_cap: e.target.value })
            }
          />

          <input
            placeholder="Geo"
            value={offerForm.geo}
            onChange={(e) =>
              setOfferForm({ ...offerForm, geo: e.target.value })
            }
          />

          <input
            placeholder="Carrier"
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
            <option value="NORMAL">NORMAL (Primary)</option>
            <option value="FALLBACK">FALLBACK</option>
          </select>

          <button>Create Offer</button>
        </form>

        {/* OFFER TABLE */}
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Offer ID</th>
              <th>Advertiser</th>
              <th>Service</th>
              <th>Geo</th>
              <th>Carrier</th>
              <th>Daily Cap</th>
              <th>Used</th>
              <th>Remaining</th>
              <th>Route</th>
              <th>Status</th>
              <th>Control</th>
              <th>Params</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{o.advertiser_name || "-"}</td>
                <td>{o.service_name}</td>
                <td>{o.geo}</td>
                <td>{o.carrier}</td>
                <td>{o.daily_cap || "∞"}</td>
                <td>{o.today_hits}</td>
                <td>{remaining(o)}</td>
                <td>{o.service_type}</td>
                <td>{getStatusBadge(o)}</td>
                <td>
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
                <td>
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
                    <td>{p.param_key}</td>
                    <td>{p.param_value}</td>
                    <td>
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
    padding: "80px 40px 40px",
    fontFamily: "Inter, system-ui, Arial",
  },
  card: {
    background: "#fff",
    padding: 20,
    marginTop: 20,
    borderRadius: 6,
  },
  inline: { display: "flex", gap: 10 },
  table: {
    width: "90%",
    margin: "20px auto",
    borderCollapse: "collapse",
  },
  badgeActive: { color: "green", fontWeight: 600 },
  badgeCap: { color: "red", fontWeight: 600 },
  badgeFallback: { color: "#ca8a04", fontWeight: 600 },
};
