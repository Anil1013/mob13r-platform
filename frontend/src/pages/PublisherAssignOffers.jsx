import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

export default function PublisherAssignOffers() {
  const { publisherId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [offers, setOffers] = useState([]);
  const [assigned, setAssigned] = useState([]);

  const [offerId, setOfferId] = useState("");
  const [publisherCpa, setPublisherCpa] = useState("");
  const [dailyCap, setDailyCap] = useState("");
  const [passPercent, setPassPercent] = useState(100);
  const [weight, setWeight] = useState(100);

  /* ================= AUTH ================= */
  useEffect(() => {
    if (!token) navigate("/login");
    loadData();
    // eslint-disable-next-line
  }, []);

  /* ================= LOAD DATA ================= */
  const loadData = async () => {
    const [offersRes, assignedRes] = await Promise.all([
      fetch(`${API_BASE}/api/offers`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${API_BASE}/api/publishers/${publisherId}/offers`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    const offersData = await offersRes.json();
    const assignedData = await assignedRes.json();

    if (offersData.status === "SUCCESS") setOffers(offersData.data);
    if (assignedData.status === "SUCCESS") setAssigned(assignedData.data);
  };

  /* ================= ASSIGN OFFER ================= */
  const assignOffer = async () => {
    if (!offerId || !publisherCpa) {
      alert("Offer and CPA required");
      return;
    }

    await fetch(`${API_BASE}/api/publishers/${publisherId}/offers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        offer_id: offerId,
        publisher_cpa: publisherCpa,
        daily_cap: dailyCap,
        pass_percent: passPercent,
        weight,
      }),
    });

    setOfferId("");
    setPublisherCpa("");
    setDailyCap("");
    setPassPercent(100);
    setWeight(100);

    loadData();
  };

  /* ================= TOGGLE STATUS ================= */
  const toggleStatus = async (id, status) => {
    await fetch(`${API_BASE}/api/publisher-offers/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status: status === "active" ? "paused" : "active",
      }),
    });

    setAssigned((prev) =>
      prev.map((o) =>
        o.id === id
          ? { ...o, status: status === "active" ? "paused" : "active" }
          : o
      )
    );
  };

  return (
    <>
      <Navbar />

      <div style={{ padding: 24 }}>
        <h2>Assign Offers to Publisher</h2>

        {/* ================= ASSIGN FORM ================= */}
        <div style={box}>
          <select
            value={offerId}
            onChange={(e) => setOfferId(e.target.value)}
          >
            <option value="">Select Offer</option>
            {offers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.geo} / {o.carrier})
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Publisher CPA"
            value={publisherCpa}
            onChange={(e) => setPublisherCpa(e.target.value)}
          />

          <input
            type="number"
            placeholder="Daily Cap"
            value={dailyCap}
            onChange={(e) => setDailyCap(e.target.value)}
          />

          <input
            type="number"
            placeholder="Pass %"
            value={passPercent}
            onChange={(e) => setPassPercent(e.target.value)}
          />

          <input
            type="number"
            placeholder="Weight"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />

          <button onClick={assignOffer}>Assign Offer</button>
        </div>

        {/* ================= ASSIGNED OFFERS ================= */}
        <table style={table}>
          <thead>
            <tr>
              <th>Offer</th>
              <th>Geo</th>
              <th>Carrier</th>
              <th>CPA</th>
              <th>Cap</th>
              <th>Pass %</th>
              <th>Weight</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {assigned.map((o) => (
              <tr key={o.id}>
                <td>{o.offer_name}</td>
                <td>{o.geo}</td>
                <td>{o.carrier}</td>
                <td>${o.publisher_cpa}</td>
                <td>{o.daily_cap || "-"}</td>
                <td>{o.pass_percent}%</td>
                <td>{o.weight}</td>
                <td>
                  <span
                    style={{
                      color: o.status === "active" ? "green" : "red",
                      fontWeight: "bold",
                    }}
                  >
                    {o.status.toUpperCase()}
                  </span>
                </td>
                <td>
                  <button onClick={() => toggleStatus(o.id, o.status)}>
                    {o.status === "active" ? "Pause" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}

            {!assigned.length && (
              <tr>
                <td colSpan="9" align="center">
                  No offers assigned
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ================= STYLES ================= */
const box = {
  display: "flex",
  gap: 10,
  marginBottom: 20,
  flexWrap: "wrap",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  border: "1px solid #ccc",
};

