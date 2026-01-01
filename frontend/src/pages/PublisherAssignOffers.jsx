import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

export default function PublisherAssignOffers() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [publishers, setPublishers] = useState([]);
  const [offers, setOffers] = useState([]);
  const [publisherId, setPublisherId] = useState("");
  const [assigned, setAssigned] = useState([]);

  const [form, setForm] = useState({
    offer_id: "",
    publisher_cpa: "",
    daily_cap: "",
    pass_percent: 100,
    weight: 100,
  });

  /* ================= AUTH GUARD ================= */
  useEffect(() => {
    if (!token) navigate("/login");
    loadBaseData();
    // eslint-disable-next-line
  }, []);

  const loadBaseData = async () => {
    const [pRes, oRes] = await Promise.all([
      fetch(`${API_BASE}/api/publishers`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${API_BASE}/api/offers`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    const pData = await pRes.json();
    const oData = await oRes.json();

    setPublishers(pData.data || []);
    setOffers(oData || []);
  };

  /* ================= LOAD ASSIGNED ================= */
  const loadAssigned = async (pid) => {
    const res = await fetch(`${API_BASE}/api/publishers/${pid}/offers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setAssigned(data.data || []);
  };

  /* ================= ASSIGN OFFER ================= */
  const assignOffer = async () => {
    if (!publisherId || !form.offer_id) {
      alert("Publisher & Offer required");
      return;
    }

    const res = await fetch(
      `${API_BASE}/api/publishers/${publisherId}/offers`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      }
    );

    const data = await res.json();
    if (data.status === "SUCCESS") {
      setForm({
        offer_id: "",
        publisher_cpa: "",
        daily_cap: "",
        pass_percent: 100,
        weight: 100,
      });
      loadAssigned(publisherId);
    } else {
      alert(data.message);
    }
  };

  /* ================= TOGGLE STATUS ================= */
  const toggleStatus = async (row) => {
    await fetch(
      `${API_BASE}/api/publishers/${publisherId}/offers/${row.id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: row.status === "active" ? "paused" : "active",
        }),
      }
    );

    setAssigned((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? { ...r, status: r.status === "active" ? "paused" : "active" }
          : r
      )
    );
  };

  return (
    <>
      <Navbar />
      <div style={{ padding: 24 }}>
        <h2>Assign Offers to Publisher</h2>

        {/* SELECT PUBLISHER */}
        <select
          value={publisherId}
          onChange={(e) => {
            setPublisherId(e.target.value);
            loadAssigned(e.target.value);
          }}
        >
          <option value="">Select Publisher</option>
          {publishers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* ASSIGN FORM */}
        {publisherId && (
          <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
            <select
              value={form.offer_id}
              onChange={(e) =>
                setForm({ ...form, offer_id: e.target.value })
              }
            >
              <option value="">Select Offer</option>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.service_name} | {o.geo} | {o.carrier}
                </option>
              ))}
            </select>

            <input
              placeholder="Publisher CPA"
              value={form.publisher_cpa}
              onChange={(e) =>
                setForm({ ...form, publisher_cpa: e.target.value })
              }
            />
            <input
              placeholder="Daily Cap"
              value={form.daily_cap}
              onChange={(e) =>
                setForm({ ...form, daily_cap: e.target.value })
              }
            />
            <input
              placeholder="Pass %"
              value={form.pass_percent}
              onChange={(e) =>
                setForm({ ...form, pass_percent: e.target.value })
              }
            />
            <input
              placeholder="Weight"
              value={form.weight}
              onChange={(e) =>
                setForm({ ...form, weight: e.target.value })
              }
            />

            <button onClick={assignOffer}>Assign</button>
          </div>
        )}

        {/* ASSIGNED TABLE */}
        {assigned.length > 0 && (
          <table
            border="1"
            cellPadding="8"
            style={{ marginTop: 20, width: "100%", textAlign: "center" }}
          >
            <thead>
              <tr>
                <th>Offer</th>
                <th>CPA</th>
                <th>Cap</th>
                <th>Pass %</th>
                <th>Weight</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {assigned.map((a) => (
                <tr key={a.id}>
                  <td>{a.service_name}</td>
                  <td>${a.publisher_cpa}</td>
                  <td>{a.daily_cap || "∞"}</td>
                  <td>{a.pass_percent}%</td>
                  <td>{a.weight}</td>
                  <td>
                    <span
                      style={{
                        color: a.status === "active" ? "green" : "red",
                        fontWeight: 600,
                      }}
                    >
                      {a.status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => toggleStatus(a)}>
                      {a.status === "active" ? "Pause" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
