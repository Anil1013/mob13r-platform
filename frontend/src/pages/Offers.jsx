import { useEffect, useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

/* =========================
   UTIL: OFFER ID GENERATOR
========================= */
const generateOfferId = (geo, carrier, index) =>
  `OFF-${geo.slice(0, 2).toUpperCase()}-${carrier
    .slice(0, 4)
    .toUpperCase()}-${String(index + 1).padStart(3, "0")}`;

export default function Offers() {
  /* =========================
     STATE
  ========================= */
  const [offers, setOffers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);

  /* =========================
     FETCH OFFERS (GET READY)
     👉 Later replace with API
  ========================= */
  useEffect(() => {
    // GET /api/offers
    setOffers([
      {
        name: "Shemaroo Weekly Pack",
        advertiserId: "ADV-001",
        geo: "Kuwait",
        carrier: "Zain",
        payout: 0.5,
        revenue: 1.2,
        status: "Active",

        apis: {
          pinSend: {
            url: "https://stc-kw.kidzo.mpx.mobi/api/v2/pin/send",
            method: "POST",
            params: ["msisdn", "token", "cycle", "pixel", "contentURL", "confirmButtonHTMLId"],
          },
          pinVerify: {
            url: "https://stc-kw.kidzo.mpx.mobi/api/v2/pin/verify",
            method: "POST",
            params: ["msisdn", "pin", "token", "cycle"],
          },
          statusCheck: {
            url: "https://selapi.selvasportal.com:444/api/service/check-status",
            method: "POST",
          },
          portalUrl: {
            url: "https://selapi.selvasportal.com:444/api/service/product-url",
            method: "POST",
          },
        },

        antifraud: {
          enabled: true,
          scriptUrl: "https://fd.sla-alacrity.com/d513e9e03227.js",
          partner: "partner:977bade4-42dc-4c4c-b957-3c8ac2fa4a2b",
          service: "campaign:c4ed200275a5b38934b17f30cc79a8ef45eac926",
        },
      },
    ]);
  }, []);

  /* =========================
     SAVE OFFER (POST READY)
  ========================= */
  const saveOffer = (offer) => {
    if (editingOffer !== null) {
      setOffers((prev) =>
        prev.map((o, i) => (i === editingOffer ? offer : o))
      );
    } else {
      setOffers((prev) => [...prev, offer]);
    }
    setShowForm(false);
    setEditingOffer(null);
  };

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div style={styles.main}>
        <Header />

        <div style={styles.content}>
          <div style={styles.top}>
            <h2>Offers</h2>
            <button style={styles.addBtn} onClick={() => setShowForm(true)}>
              + Add Offer
            </button>
          </div>

          {/* =========================
              OFFERS TABLE
          ========================= */}
          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Geo</th>
                  <th>Carrier</th>
                  <th>Payout</th>
                  <th>Revenue</th>
                  <th>Status</th>
                  <th>Fraud</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {offers.map((o, index) => (
                  <tr key={index}>
                    <td style={styles.mono}>
                      {generateOfferId(o.geo, o.carrier, index)}
                    </td>
                    <td>{o.name}</td>
                    <td>{o.geo}</td>
                    <td>{o.carrier}</td>
                    <td>${o.payout}</td>
                    <td>${o.revenue}</td>
                    <td>
                      <span
                        style={{
                          ...styles.badge,
                          background: o.status === "Active" ? "#16a34a" : "#ca8a04",
                        }}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td>
                      {o.antifraud.enabled ? (
                        <span style={{ ...styles.badge, background: "#2563eb" }}>
                          Enabled
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <button
                        style={styles.linkBtn}
                        onClick={() => {
                          setEditingOffer(index);
                          setShowForm(true);
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* =========================
              OFFER FORM
          ========================= */}
          {showForm && (
            <OfferForm
              initialData={editingOffer !== null ? offers[editingOffer] : null}
              onSave={saveOffer}
              onClose={() => {
                setShowForm(false);
                setEditingOffer(null);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================
   OFFER FORM COMPONENT
========================= */
function OfferForm({ initialData, onSave, onClose }) {
  const [form, setForm] = useState(
    initialData || {
      name: "",
      advertiserId: "",
      geo: "",
      carrier: "",
      payout: "",
      revenue: "",
      status: "Active",
      apis: {
        pinSend: { url: "", method: "POST", params: "" },
        pinVerify: { url: "", method: "POST", params: "" },
        statusCheck: { url: "", method: "POST" },
        portalUrl: { url: "", method: "POST" },
      },
      antifraud: {
        enabled: false,
        scriptUrl: "",
        partner: "",
        service: "",
      },
    }
  );

  return (
    <div style={styles.modal}>
      <div style={styles.modalCard}>
        <h3>{initialData ? "Edit Offer" : "Create Offer"}</h3>

        <input placeholder="Offer Name" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />

        <input placeholder="Advertiser ID" value={form.advertiserId}
          onChange={(e) => setForm({ ...form, advertiserId: e.target.value })} />

        <input placeholder="Geo (Kuwait)" value={form.geo}
          onChange={(e) => setForm({ ...form, geo: e.target.value })} />

        <input placeholder="Carrier (Zain)" value={form.carrier}
          onChange={(e) => setForm({ ...form, carrier: e.target.value })} />

        <input placeholder="Payout" value={form.payout}
          onChange={(e) => setForm({ ...form, payout: e.target.value })} />

        <input placeholder="Revenue" value={form.revenue}
          onChange={(e) => setForm({ ...form, revenue: e.target.value })} />

        <h4>PIN Send API URL</h4>
        <input value={form.apis.pinSend.url}
          onChange={(e) =>
            setForm({
              ...form,
              apis: {
                ...form.apis,
                pinSend: { ...form.apis.pinSend, url: e.target.value },
              },
            })
          }
        />

        <h4>Anti-Fraud (Optional)</h4>
        <label>
          <input
            type="checkbox"
            checked={form.antifraud.enabled}
            onChange={(e) =>
              setForm({
                ...form,
                antifraud: { ...form.antifraud, enabled: e.target.checked },
              })
            }
          /> Enable Anti-Fraud
        </label>

        <input placeholder="Fraud Script URL" value={form.antifraud.scriptUrl}
          onChange={(e) =>
            setForm({
              ...form,
              antifraud: { ...form.antifraud, scriptUrl: e.target.value },
            })
          }
        />

        <div style={styles.actions}>
          <button onClick={() => onSave(form)}>Save</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   STYLES
========================= */
const styles = {
  main: { flex: 1, background: "#020617", minHeight: "100vh" },
  content: { padding: 24, color: "#fff" },
  top: { display: "flex", justifyContent: "space-between", marginBottom: 20 },
  addBtn: { background: "#2563eb", color: "#fff", padding: "8px 14px", border: 0 },
  card: { border: "1px solid #1e293b", borderRadius: 12, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "center" },
  mono: { fontFamily: "monospace", fontSize: 12, color: "#93c5fd" },
  badge: { padding: "4px 10px", borderRadius: 999, color: "#fff", fontSize: 12 },
  linkBtn: { background: "none", color: "#38bdf8", border: 0, cursor: "pointer" },

  modal: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    background: "#020617",
    padding: 24,
    width: 520,
    borderRadius: 12,
  },
  actions: { display: "flex", gap: 12, marginTop: 20 },
};
