import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

const generateOfferId = (geo, carrier, index) =>
  `OFF-${geo.slice(0,2).toUpperCase()}-${carrier.slice(0,4).toUpperCase()}-${String(index+1).padStart(3,"0")}`;

export default function Offers() {
  const [offers, setOffers] = useState([]);

  const [form, setForm] = useState({
    name: "",
    geo: "",
    carrier: "",
    plan: "Weekly",
    payout: "",
    revenue: "",
    fraudEnabled: true,
    partnerId: "",
    serviceId: "",
    checkStatusUrl: "",
    sendOtpUrl: "",
    verifyOtpUrl: "",
    portalUrl: ""
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const addOffer = () => {
    const newOffer = {
      offerId: generateOfferId(form.geo, form.carrier, offers.length),
      ...form,
      status: "Active"
    };
    setOffers([...offers, newOffer]);
    setForm({});
  };

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div style={{ flex: 1, background: "#020617", minHeight: "100vh" }}>
        <Header />

        <div style={{ padding: 24, color: "#fff" }}>
          <h2>Create / Manage Offers</h2>

          {/* CREATE FORM */}
          <div style={card}>
            <input name="name" placeholder="Offer Name" onChange={handleChange} />
            <input name="geo" placeholder="Geo (Kuwait)" onChange={handleChange} />
            <input name="carrier" placeholder="Carrier (Zain)" onChange={handleChange} />
            <input name="payout" placeholder="Payout" onChange={handleChange} />
            <input name="revenue" placeholder="Revenue" onChange={handleChange} />
            <input name="partnerId" placeholder="Fraud Partner ID" onChange={handleChange} />
            <input name="serviceId" placeholder="Fraud Service ID" onChange={handleChange} />
            <input name="checkStatusUrl" placeholder="Check Status API URL" onChange={handleChange} />
            <input name="sendOtpUrl" placeholder="Send OTP API URL" onChange={handleChange} />
            <input name="verifyOtpUrl" placeholder="Verify OTP API URL" onChange={handleChange} />
            <input name="portalUrl" placeholder="Portal URL API" onChange={handleChange} />

            <button onClick={addOffer}>Save Offer</button>
          </div>

          {/* LIST */}
          <table style={{ width: "100%", marginTop: 20 }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Geo</th>
                <th>Carrier</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.offerId}>
                  <td>{o.offerId}</td>
                  <td>{o.name}</td>
                  <td>{o.geo}</td>
                  <td>{o.carrier}</td>
                  <td>{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>
      </div>
    </div>
  );
}

const card = {
  background: "#020617",
  border: "1px solid #1e293b",
  padding: 16,
  borderRadius: 12,
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 12
};
