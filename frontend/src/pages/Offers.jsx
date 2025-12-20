import { useState, useEffect } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

/* ===============================
   UTIL: Offer ID Generator
================================ */
const generateOfferId = (geo, carrier, plan, index) => {
  return `OFF-${geo.slice(0,2).toUpperCase()}-${carrier
    .slice(0,4)
    .toUpperCase()}-${plan.toUpperCase()}-${String(index+1).padStart(3,"0")}`;
};

/* ===============================
   MAIN COMPONENT
================================ */
export default function Offers() {

  /* -----------------------------
     OFFERS STATE
     (GET / POST ready)
  ------------------------------*/
  const [offers, setOffers] = useState([]);
  const [showForm, setShowForm] = useState(false);

  /* -----------------------------
     NEW OFFER FORM STATE
  ------------------------------*/
  const [form, setForm] = useState({
    name: "",
    advertiser: "Shemaroo",
    geo: "Kuwait",
    carrier: "Zain",
    plan: "weekly",
    payout: "",
    revenue: "",
    status: "Active",

    // API CONFIG
    pinSendUrl: "",
    pinVerifyUrl: "",
    statusCheckUrl: "",
    portalUrl: "",

    // Anti-fraud
    fraudJs: "",
    partnerId: "",
    serviceId: "",
  });

  /* -----------------------------
     SIMULATED GET (API READY)
  ------------------------------*/
  useEffect(() => {
    // 🔁 Later replace with real GET API
    const apiResponse = [
      {
        name: "Shemaroo Weekly Pack",
        advertiser: "Shemaroo",
        geo: "Kuwait",
        carrier: "Zain",
        plan: "weekly",
        payout: 0.8,
        revenue: 1.5,
        status: "Active",

        apis: {
          pinSend: "https://stc-kw.kidzo.mpx.mobi/api/v2/pin/send",
          pinVerify: "https://stc-kw.kidzo.mpx.mobi/api/v2/pin/verify",
          statusCheck: "https://selapi.selvasportal.com/api/service/check-status",
          portal: "https://stc.kw.kidzo.mobi/",
        },

        antifraud: {
          js: "https://fd.sla-alacrity.com/d513e9e03227.js",
          partnerId: "partner:977bade4-42dc-4c4c-b957-3c8ac2fa4a2b",
          serviceId: "campaign:52d659a55c4e41953de8ed68d57f06ef89d6a217",
        },
      }
    ];

    setOffers(apiResponse);
  }, []);

  /* -----------------------------
     HANDLE FORM SUBMIT (POST)
  ------------------------------*/
  const handleSubmit = () => {
    const newOffer = {
      ...form,
      payout: Number(form.payout),
      revenue: Number(form.revenue),
      apis: {
        pinSend: form.pinSendUrl,
        pinVerify: form.pinVerifyUrl,
        statusCheck: form.statusCheckUrl,
        portal: form.portalUrl,
      },
      antifraud: {
        js: form.fraudJs,
        partnerId: form.partnerId,
        serviceId: form.serviceId,
      },
    };

    // 🔁 Later replace with POST API
    setOffers(prev => [...prev, newOffer]);
    setShowForm(false);
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
              + Create Offer
            </button>
          </div>

          {/* =======================
              OFFERS TABLE
          ======================== */}
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
              </tr>
            </thead>
            <tbody>
              {offers.map((o, i) => (
                <tr key={i}>
                  <td style={styles.mono}>
                    {generateOfferId(o.geo, o.carrier, o.plan, i)}
                  </td>
                  <td>{o.name}</td>
                  <td>{o.geo}</td>
                  <td>{o.carrier}</td>
                  <td>${o.payout}</td>
                  <td>${o.revenue}</td>
                  <td>
                    <span style={{
                      ...styles.status,
                      background: o.status === "Active" ? "#16a34a" : "#ca8a04"
                    }}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* =======================
              CREATE OFFER FORM
          ======================== */}
          {showForm && (
            <div style={styles.form}>
              <h3>Create Offer</h3>

              <input placeholder="Offer Name"
                onChange={e => setForm({...form, name:e.target.value})} />

              <input placeholder="PIN Send API URL"
                onChange={e => setForm({...form, pinSendUrl:e.target.value})} />

              <input placeholder="PIN Verify API URL"
                onChange={e => setForm({...form, pinVerifyUrl:e.target.value})} />

              <input placeholder="Status Check API URL"
                onChange={e => setForm({...form, statusCheckUrl:e.target.value})} />

              <input placeholder="Portal URL"
                onChange={e => setForm({...form, portalUrl:e.target.value})} />

              <input placeholder="Anti-Fraud JS URL"
                onChange={e => setForm({...form, fraudJs:e.target.value})} />

              <input placeholder="Partner ID"
                onChange={e => setForm({...form, partnerId:e.target.value})} />

              <input placeholder="Service ID"
                onChange={e => setForm({...form, serviceId:e.target.value})} />

              <button onClick={handleSubmit}>Save Offer</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* ===============================
   STYLES
================================ */
const styles = {
  main: { flex:1, background:"#020617", minHeight:"100vh" },
  content: { padding:"24px", color:"#fff" },
  top: { display:"flex", justifyContent:"space-between", alignItems:"center" },
  addBtn: { background:"#2563eb", color:"#fff", padding:"8px 14px", border:"none", borderRadius:8 },
  table: { width:"100%", marginTop:20, borderCollapse:"collapse", textAlign:"center" },
  mono: { fontFamily:"monospace", fontSize:12, color:"#93c5fd" },
  status: { padding:"4px 12px", borderRadius:999, color:"#fff" },
  form: { marginTop:30, background:"#020617", padding:20, border:"1px solid #1e293b", borderRadius:12 }
};
