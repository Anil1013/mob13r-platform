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
      return <span style={styles.badgeFallback}>🟡 Fallback Active</span>;
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

        {/* 🔹 TOP BAR */}
        <div style={styles.topBar}>
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

          <form onSubmit={createOffer} style={styles.createRow}>
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
              <option value="NORMAL">NORMAL</option>
              <option value="FALLBACK">FALLBACK</option>
            </select>

            <button>Create</button>
          </form>
        </div>

        {/* 🔹 OFFER TABLE */}
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
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
    padding: "60px 30px 30px",
    fontFamily: "Inter, system-ui, Arial",
  },
  topBar: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
  },
  createRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  card: {
    background: "#fff",
    padding: 20,
    marginTop: 20,
    borderRadius: 6,
  },
  inline: { display: "flex", gap: 10 },
  tableWrap: {
    background: "#fff",
    padding: 10,
    borderRadius: 6,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  badgeActive: { color: "green", fontWeight: 600 },
  badgeCap: { color: "red", fontWeight: 600 },
  badgeFallback: { color: "#ca8a04", fontWeight: 600 },
};
