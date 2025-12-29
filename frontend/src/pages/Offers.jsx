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

  const fetchOffers = async (advertiserId) => {
    if (!advertiserId) return;
    const res = await fetch(
      `${API_BASE}/api/offers?advertiser_id=${advertiserId}`,
      { headers: authHeaders }
    );
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
    setOffers([...offers, data]);

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

  /* ---------------- UI ---------------- */
  return (
    <>
      {/* ✅ GLOBAL NAVBAR */}
      <Navbar />

      {/* ✅ PAGE CONTENT (navbar offset fixed) */}
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
          <option value="">Select Advertiser</option>
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
            placeholder="Geo (IN, PK, UAE)"
            value={offerForm.geo}
            onChange={(e) =>
              setOfferForm({ ...offerForm, geo: e.target.value })
            }
          />

          <input
            placeholder="Carrier (JIO, ZONG)"
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
            <option value="NORMAL">NORMAL</option>
            <option value="FALLBACK">FALLBACK</option>
          </select>

          <button>Create Offer</button>
        </form>

        {/* OFFER LIST */}
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Service</th>
              <th>Geo</th>
              <th>Carrier</th>
              <th>Daily Cap</th>
              <th>Type</th>
              <th>Params</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.id}>
                <td>{o.service_name}</td>
                <td>{o.geo}</td>
                <td>{o.carrier}</td>
                <td>{o.daily_cap || "∞"}</td>
                <td>{o.service_type}</td>
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
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                  <th></th>
                </tr>
              </thead>
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
    padding: "80px 40px 40px", // ✅ FIXED NAVBAR OFFSET
    fontFamily: "Inter, system-ui, Arial",
  },
  card: {
    background: "#fff",
    padding: 20,
    marginTop: 20,
    borderRadius: 6,
  },
  inline: {
    display: "flex",
    gap: 10,
  },
  table: {
    width: "100%",
    marginTop: 20,
    borderCollapse: "collapse",
  },
};
