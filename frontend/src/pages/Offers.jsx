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
    fetchOffers(); // load all offers
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
  const remaining = (o) =>
    o.daily_cap ? Math.max(o.daily_cap - o.today_hits, 0) : "∞";

  const getStatusBadge = (o) => {
    if (o.service_type === "FALLBACK")
      return <span style={styles.badgeFallback}>🟡 Fallback</span>;
    if (o.daily_cap && o.today_hits >= o.daily_cap)
      return <span style={styles.badgeCap}>🔴 Cap Reached</span>;
    return <span style={styles.badgeActive}>🟢 Active</span>;
  };

  /* ---------------- UI ---------------- */
  return (
    <>
      <Navbar />

      <div style={styles.page}>
        <h1>Offers</h1>

        {/* 🔝 TOP BAR */}
        <div style={styles.topBar}>
          {/* Advertiser */}
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

          {/* Create Offer */}
          <form onSubmit={createOffer} style={styles.createRow}>
            <input placeholder="Service" required
              value={offerForm.service_name}
              onChange={(e)=>setOfferForm({...offerForm,service_name:e.target.value})}
            />
            <input placeholder="CPA"
              value={offerForm.cpa}
              onChange={(e)=>setOfferForm({...offerForm,cpa:e.target.value})}
            />
            <input placeholder="Daily Cap"
              value={offerForm.daily_cap}
              onChange={(e)=>setOfferForm({...offerForm,daily_cap:e.target.value})}
            />
            <input placeholder="Geo"
              value={offerForm.geo}
              onChange={(e)=>setOfferForm({...offerForm,geo:e.target.value})}
            />
            <input placeholder="Carrier"
              value={offerForm.carrier}
              onChange={(e)=>setOfferForm({...offerForm,carrier:e.target.value})}
            />
            <select
              value={offerForm.service_type}
              onChange={(e)=>setOfferForm({...offerForm,service_type:e.target.value})}
            >
              <option value="NORMAL">Primary</option>
              <option value="FALLBACK">Fallback</option>
            </select>
            <button>Create</button>
          </form>
        </div>

        {/* 📊 OFFER TABLE */}
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Advertiser</th>
                <th>Service</th>
                <th>Geo</th>
                <th>Carrier</th>
                <th>Cap</th>
                <th>Used</th>
                <th>Remain</th>
                <th>Route</th>
                <th>Status</th>
                <th>Control</th>
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
                    <button
                      onClick={() =>
                        changeServiceType(
                          o.id,
                          o.service_type === "NORMAL" ? "FALLBACK" : "NORMAL"
                        )
                      }
                    >
                      Toggle
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
  page: {
    padding: "60px 40px",
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
  tableWrap: {
    display: "flex",
    justifyContent: "center",
    marginTop: 10,
  },
  table: {
    width: "95%",
    borderCollapse: "collapse",
    background: "#fff",
  },
  badgeActive: { color: "green", fontWeight: 600 },
  badgeCap: { color: "red", fontWeight: 600 },
  badgeFallback: { color: "#ca8a04", fontWeight: 600 },
};
