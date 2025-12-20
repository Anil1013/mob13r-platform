import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

/* 🔑 ID Generator */
const generateOfferId = (geo, carrier, index) =>
  `OFF-${geo.slice(0,2).toUpperCase()}-${carrier.slice(0,4).toUpperCase()}-${String(index+1).padStart(3,"0")}`;

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    advertiser: "",
    geo: "",
    carrier: "",
    plan: "",
    price: "",
    payout: "",
    revenue: "",
    antifraudEnabled: false,
    antifraudScript: "",
    partnerId: "",
    serviceId: ""
  });

  /* CREATE OFFER */
  const createOffer = () => {
    const newOffer = {
      id: generateOfferId(form.geo, form.carrier, offers.length),
      ...form,
      status: "Active",
      apis: {
        checkStatus: {},
        sendOtp: {},
        verifyOtp: {},
        portal: {}
      }
    };
    setOffers([...offers, newOffer]);
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
            <button onClick={() => setShowForm(true)} style={styles.add}>
              + Create Offer
            </button>
          </div>

          {/* OFFER TABLE */}
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
              {offers.map(o => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.name}</td>
                  <td>{o.geo}</td>
                  <td>{o.carrier}</td>
                  <td>${o.payout}</td>
                  <td>${o.revenue}</td>
                  <td>{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* CREATE FORM */}
          {showForm && (
            <div style={styles.form}>
              <h3>Create / Edit Offer</h3>

              <input placeholder="Offer Name" onChange={e => setForm({...form,name:e.target.value})}/>
              <input placeholder="Advertiser" onChange={e => setForm({...form,advertiser:e.target.value})}/>
              <input placeholder="Geo (Kuwait)" onChange={e => setForm({...form,geo:e.target.value})}/>
              <input placeholder="Carrier (Zain)" onChange={e => setForm({...form,carrier:e.target.value})}/>
              <input placeholder="Plan (Daily / Weekly / Monthly)" onChange={e => setForm({...form,plan:e.target.value})}/>
              <input placeholder="Price" onChange={e => setForm({...form,price:e.target.value})}/>
              <input placeholder="Payout" onChange={e => setForm({...form,payout:e.target.value})}/>
              <input placeholder="Revenue" onChange={e => setForm({...form,revenue:e.target.value})}/>

              <label>
                <input type="checkbox" onChange={e=>setForm({...form,antifraudEnabled:e.target.checked})}/>
                Enable Anti-Fraud
              </label>

              {form.antifraudEnabled && (
                <>
                  <input placeholder="Fraud Script URL" onChange={e=>setForm({...form,antifraudScript:e.target.value})}/>
                  <input placeholder="Partner ID" onChange={e=>setForm({...form,partnerId:e.target.value})}/>
                  <input placeholder="Service ID" onChange={e=>setForm({...form,serviceId:e.target.value})}/>
                </>
              )}

              <button onClick={createOffer}>Save Offer</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* STYLES */
const styles = {
  main:{flex:1,background:"#020617",minHeight:"100vh"},
  content:{padding:24,color:"#fff"},
  top:{display:"flex",justifyContent:"space-between",marginBottom:16},
  add:{background:"#2563eb",color:"#fff",border:"none",padding:"8px 14px"},
  table:{width:"100%",textAlign:"center",borderCollapse:"collapse"},
  form:{marginTop:20,background:"#020617",border:"1px solid #1e293b",padding:16}
};
