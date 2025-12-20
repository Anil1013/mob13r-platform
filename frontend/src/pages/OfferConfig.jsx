import { useParams } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

export default function OfferConfig() {
  const { offerId } = useParams();

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div style={{ flex: 1, background: "#020617", minHeight: "100vh" }}>
        <Header />

        <div style={{ padding: "24px", color: "#fff" }}>
          <h2>Offer Configuration</h2>
          <p>Offer ID: <b>{offerId}</b></p>

          <div style={card}>
            <h3>Execution Flow</h3>

            <label>Request Method</label>
            <select><option>POST</option><option>GET</option></select>

            <label>PIN Send API</label>
            <input placeholder="https://api.carrier.com/pin/send" />

            <label>PIN Verify API</label>
            <input placeholder="https://api.carrier.com/pin/verify" />

            <label>Status Check API</label>
            <input placeholder="https://api.carrier.com/status" />

            <label>Portal / Redirect API</label>
            <input placeholder="https://api.carrier.com/portal" />

            <label>
              <input type="checkbox" /> Enable Anti-Fraud Script
            </label>

            <button style={saveBtn}>Save Configuration</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const card = {
  marginTop: "20px",
  padding: "20px",
  border: "1px solid #1e293b",
  borderRadius: "12px",
  display: "grid",
  gap: "12px",
};

const saveBtn = {
  marginTop: "12px",
  background: "#16a34a",
  padding: "10px",
  border: "none",
  borderRadius: "8px",
  color: "#fff",
  cursor: "pointer",
};
