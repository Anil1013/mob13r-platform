import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

const API_BASE = "https://backend.mob13r.com";

export default function Offers() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  /* ---------------- STATE ---------------- */
  const [advertisers, setAdvertisers] = useState([]);
  const [offers, setOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [parameters, setParameters] = useState([]);

  const [offerForm, setOfferForm] = useState({
    advertiser_id: "",
    service_name: "",
    cpa: "",
    capping: "",
    otp_length: 4,
    service_type: "NORMAL",
  });

  const [paramForm, setParamForm] = useState({
    param_key: "",
    param_value: "",
  });

  /* ---------------- FETCH DATA ---------------- */
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const fetchAdvertisers = async () => {
    const res = await fetch(`${API_BASE}/api/advertisers`, {
      headers: authHeaders,
    });
    setAdvertisers(await res.json());
  };

  const fetchOffers = async () => {
    if (!offerForm.advertiser_id) return;
    const res = await fetch(
      `${API_BASE}/api/offers?advertiser_id=${offerForm.advertiser_id}`,
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

  /* ---------------- OFFER CREATE ---------------- */
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
      advertiser_id: offerForm.advertiser_id,
      service_name: "",
      cpa: "",
      capping: "",
      otp_length: 4,
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

  const logout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  /* ---------------- UI ---------------- */
  return (
    <>
      {/* NAVBAR */}
      <div style={styles.navbar}>
        <div style={styles.left}>
          <div style={styles.brand}>Mob13r</div>
          <NavLink to="/dashboard" style={styles.link}>Dashboard</NavLink>
          <NavLink to="/advertisers" style={styles.link}>Advertisers</NavLink>
          <NavLink to="/offers" style={styles.activeLink}>Offers</NavLink>
        </div>
        <div style={styles.right}>
          <span>{user?.email}</span>
          <button style={styles.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </div>

      {/* CONTENT */}
      <div style={styles.page}>
        <h1>Offers</h1>

        {/* SELECT ADVERTISER */}
        <select
          value={offerForm.advertiser_id}
          onChange={(e) => {
            setOfferForm({ ...offerForm, advertiser_id: e.target.value });
            setSelectedOffer(null);
            fetchOffers();
          }}
        >
          <option value="">Select Advertiser</option>
          {advertisers.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        {/* CREATE OFFER */}
        <form onSubmit={createOffer} style={styles.card}>
          <h3>Create Offer</h3>

          <input placeholder="Service Name" required
            value={offerForm.service_name}
            onChange={(e) => setOfferForm({ ...offerForm, service_name: e.target.value })}
          />

          <input placeholder="CPA"
            value={offerForm.cpa}
            onChange={(e) => setOfferForm({ ...offerForm, cpa: e.target.value })}
          />

          <input placeholder="Capping"
            value={offerForm.capping}
            onChange={(e) => setOfferForm({ ...offerForm, capping: e.target.value })}
          />

          <select
            value={offerForm.service_type}
            onChange={(e) => setOfferForm({ ...offerForm, service_type: e.target.value })}
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
              <th>CPA</th>
              <th>Status</th>
              <th>Params</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.id}>
                <td>{o.service_name}</td>
                <td>{o.cpa}</td>
                <td>{o.status}</td>
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
  navbar: {
    height: 60,
    background: "#0f172a",
    color: "#fff",
    display: "flex",
    justifyContent: "space-between",
    padding: "0 24px",
    alignItems: "center",
  },
  left: { display: "flex", gap: 20, alignItems: "center" },
  brand: { fontSize: 20, fontWeight: 700 },
  link: { color: "#cbd5f5", textDecoration: "none" },
  activeLink: { color: "#fff", fontWeight: 600 },
  right: { display: "flex", gap: 12 },
  logoutBtn: { background: "#ef4444", color: "#fff", border: 0, padding: "6px 12px" },
  page: { padding: 40 },
  card: { background: "#fff", padding: 20, marginTop: 20 },
  inline: { display: "flex", gap: 10 },
  table: { width: "100%", marginTop: 20, borderCollapse: "collapse" },
};
