import { useEffect, useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

/* 🔑 ID Generator */
const generateOfferId = (geo, carrier, plan, index) =>
  `OFF-${geo.slice(0,2).toUpperCase()}-${carrier
    .slice(0,4)
    .toUpperCase()}-${plan.toUpperCase()}-${String(index+1).padStart(3,"0")}`;

export default function Offers() {

  /* 🔁 GET / POST READY */
  const [offers, setOffers] = useState([]);
  const [form, setForm] = useState({
    name: "",
    geo: "Kuwait",
    carrier: "Zain",
    plan: "monthly",
    payout: "",
    revenue: "",
    landingPage: "",
    fraudEnabled: true,
    partnerId: "",
    serviceId: "",
  });

  /* 🔁 SIMULATE GET */
  useEffect(() => {
    const apiResponse = [
      {
        name: "Shemaroo Miniplex",
        geo: "Kuwait",
        carrier: "Zain",
        plan: "monthly",
        payout: 2.5,
        revenue: 4.0,
        landingPage: "https://miniplx.com",
        fraudEnabled: true,
        partnerId: "partner:977bade4-42dc-4c4c-b957-3c8ac2fa4a2b",
        serviceId: "campaign:c4ed200275a5b38934b17f30cc79a8ef45eac926",
      },
    ];
    setOffers(apiResponse);
  }, []);

  /* ➕ CREATE OFFER (POST READY) */
  const addOffer = () => {
    setOffers(prev => [...prev, form]);
    setForm({
      name: "",
      geo: "Kuwait",
      carrier: "Zain",
      plan: "monthly",
      payout: "",
      revenue: "",
      landingPage: "",
      fraudEnabled: true,
      partnerId: "",
      serviceId: "",
    });
  };

  return (
    <div style={{ display:"flex" }}>
      <Sidebar />
      <div style={styles.main}>
        <Header />

        <div style={styles.content}>
          <h2>Offers</h2>
          <p style={{ color:"#94a3b8" }}>
            Full API + Fraud + Parameters Config (GET & POST Ready)
          </p>

          {/* CREATE FORM */}
          <div style={styles.card}>
            <h3>Create Offer</h3>

            <input placeholder="Offer Name"
              value={form.name}
              onChange={e=>setForm({...form,name:e.target.value})} />

            <input placeholder="Landing Page URL"
              value={form.landingPage}
              onChange={e=>setForm({...form,landingPage:e.target.value})} />

            <input placeholder="Payout"
              value={form.payout}
              onChange={e=>setForm({...form,payout:e.target.value})} />

            <input placeholder="Revenue"
              value={form.revenue}
              onChange={e=>setForm({...form,revenue:e.target.value})} />

            <input placeholder="Fraud Partner ID"
              value={form.partnerId}
              onChange={e=>setForm({...form,partnerId:e.target.value})} />

            <input placeholder="Fraud Service ID"
              value={form.serviceId}
              onChange={e=>setForm({...form,serviceId:e.target.value})} />

            <button onClick={addOffer}>Add Offer</button>
          </div>

          {/* OFFERS TABLE */}
          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>ID</th><th>Name</th><th>Plan</th>
                  <th>Payout</th><th>Revenue</th><th>Fraud</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o,i)=>(
                  <tr key={i}>
                    <td style={styles.mono}>
                      {generateOfferId(o.geo,o.carrier,o.plan,i)}
                    </td>
                    <td>{o.name}</td>
                    <td>{o.plan}</td>
                    <td>${o.payout}</td>
                    <td>${o.revenue}</td>
                    <td>{o.fraudEnabled ? "Enabled" : "Off"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}

/* 🎨 Styles */
const styles = {
  main:{flex:1,background:"#020617",minHeight:"100vh"},
  content:{padding:24,color:"#fff"},
  card:{border:"1px solid #1e293b",padding:16,borderRadius:12,marginBottom:20},
  table:{width:"100%",borderCollapse:"collapse",textAlign:"center"},
  mono:{fontFamily:"monospace",fontSize:12,color:"#93c5fd"}
};
