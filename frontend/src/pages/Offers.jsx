import { useEffect, useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import OfferForm from "../components/offers/OfferForm";
import { getOffers } from "../services/offers";
import { useNavigate } from "react-router-dom";

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getOffers().then(setOffers);
  }, []);

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div style={{ flex: 1, background: "#020617", minHeight: "100vh" }}>
        <Header />

        <div style={{ padding: "24px", color: "#fff" }}>
          <div style={styles.top}>
            <h2>Offers</h2>
            <button onClick={() => setShowForm(true)}>+ Create Offer</button>
          </div>

          {showForm && <OfferForm onClose={() => setShowForm(false)} />}

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
                <th>Flow</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.name}</td>
                  <td>{o.geo}</td>
                  <td>{o.carrier}</td>
                  <td>${o.payout}</td>
                  <td>${o.revenue}</td>
                  <td>
                    <span style={o.status === "Active" ? styles.active : styles.paused}>
                      {o.status}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => navigate(`/offers/${o.id}`)}>
                      Configure
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>
      </div>
    </div>
  );
}

const styles = {
  top: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "16px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  active: {
    background: "#16a34a",
    padding: "4px 10px",
    borderRadius: "999px",
  },
  paused: {
    background: "#ca8a04",
    padding: "4px 10px",
    borderRadius: "999px",
  },
};
