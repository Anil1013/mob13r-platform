import { useEffect, useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

export default function Offers() {
  const [offers, setOffers] = useState([]);

  /* GET Offers (API ready) */
  useEffect(() => {
    // future:
    // fetch("/api/offers").then(res => res.json()).then(setOffers);

    setOffers([
      {
        id: "OFF-KW-ZAIN-MONTHLY-001",
        name: "ShemarooMe Monthly",
        geo: "Kuwait",
        carrier: "Zain",
        payout: 0.70,
        revenue: 1.50,
        status: "Active",
        executionFlow: ["Check Status", "Generate OTP", "Verify OTP", "Redirect"]
      }
    ]);
  }, []);

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div style={{ flex: 1, background: "#020617", minHeight: "100vh" }}>
        <Header />

        <div style={{ padding: 24, color: "#fff" }}>
          <h2>Offers</h2>
          <p>Complete Offer Execution Flow (API Ready)</p>

          <table style={{ width: "100%", textAlign: "center" }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Geo</th>
                <th>Carrier</th>
                <th>Payout</th>
                <th>Revenue</th>
                <th>Flow</th>
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
                  <td>
                    {o.executionFlow.map(step => (
                      <div key={step}>➡ {step}</div>
                    ))}
                  </td>
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
