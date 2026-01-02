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
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({
    offer_id: "",
    publisher_cpa: "",
    daily_cap: "",
    pass_percent: 100,
    weight: 100,
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  /* ================= AUTH ================= */
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    loadBaseData();
    // eslint-disable-next-line
  }, []);

  /* ================= LOAD BASE ================= */
  const loadBaseData = async () => {
    try {
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

      if (pData.status === "SUCCESS") setPublishers(pData.data || []);

      if (Array.isArray(oData)) setOffers(oData);
      else if (oData.status === "SUCCESS") setOffers(oData.data || []);
    } catch {
      showToast("Failed to load publishers / offers");
    }
  };

  /* ================= LOAD ASSIGNED ================= */
  const loadAssigned = async (pid) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/publishers/${pid}/offers`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json();
      setAssigned(
        data.status === "SUCCESS"
          ? data.data.map((r) => ({ ...r, isEditing: false }))
          : []
      );
    } catch {
      showToast("Failed to load assigned offers");
    }
  };

  /* ================= ASSIGN OFFER ================= */
  const assignOffer = async () => {
    if (!publisherId || !form.offer_id || !form.publisher_cpa) {
      showToast("Publisher, Offer & CPA required");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/publishers/${publisherId}/offers`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            offer_id: Number(form.offer_id),
            publisher_cpa: Number(form.publisher_cpa),
            daily_cap: form.daily_cap ? Number(form.daily_cap) : null,
            pass_percent: Number(form.pass_percent),
            weight: Number(form.weight),
          }),
        }
      );

      const data = await res.json();
      if (data.status === "SUCCESS") {
        showToast("Offer assigned");
        setForm({
          offer_id: "",
          publisher_cpa: "",
          daily_cap: "",
          pass_percent: 100,
          weight: 100,
        });
        loadAssigned(publisherId);
      } else {
        showToast(data.message || "Assign failed");
      }
    } catch {
      showToast("Server error");
    }
  };

  /* ================= SAVE EDIT ================= */
  const saveEdit = async (row) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/publishers/${publisherId}/offers/${row.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            publisher_cpa: Number(row.publisher_cpa),
            daily_cap: row.daily_cap ? Number(row.daily_cap) : null,
            pass_percent: Number(row.pass_percent),
            weight: Number(row.weight),
          }),
        }
      );

      const data = await res.json();
      if (data.status === "SUCCESS") {
        showToast("Updated");
        setAssigned((prev) =>
          prev.map((r) =>
            r.id === row.id ? { ...row, isEditing: false } : r
          )
        );
      } else {
        showToast("Update failed");
      }
    } catch {
      showToast("Server error");
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

  const assignedOfferIds = assigned.map((a) => a.offer_id);
  const availableOffers = offers.filter(
    (o) => !assignedOfferIds.includes(o.id)
  );

  return (
    <>
      <Navbar />
      {toast && <div style={toastStyle}>{toast}</div>}

      <div style={{ padding: 24 }}>
        <h2>Assign Offers to Publisher</h2>

        <select
          value={publisherId}
          onChange={(e) => {
            const pid = e.target.value;
            setPublisherId(pid);
            pid ? loadAssigned(pid) : setAssigned([]);
          }}
        >
          <option value="">Select Publisher</option>
          {publishers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {publisherId && (
          <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
            <select
              value={form.offer_id}
              onChange={(e) =>
                setForm({ ...form, offer_id: e.target.value })
              }
            >
              <option value="">Select Offer</option>
              {availableOffers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.service_name || o.name} | {o.geo} | {o.carrier}
                </option>
              ))}
            </select>

            <input
              placeholder="CPA"
              value={form.publisher_cpa}
              onChange={(e) =>
                setForm({ ...form, publisher_cpa: e.target.value })
              }
            />
            <input
              placeholder="Cap"
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assigned.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>

                  {["publisher_cpa", "daily_cap", "pass_percent", "weight"].map(
                    (field) => (
                      <td key={field}>
                        {a.isEditing ? (
                          <input
                            value={a[field] ?? ""}
                            onChange={(e) =>
                              setAssigned((prev) =>
                                prev.map((r) =>
                                  r.id === a.id
                                    ? { ...r, [field]: e.target.value }
                                    : r
                                )
                              )
                            }
                          />
                        ) : field === "daily_cap" ? (
                          a.daily_cap || "∞"
                        ) : (
                          a[field]
                        )}
                      </td>
                    )
                  )}

                  <td>
                    <b style={{ color: a.status === "active" ? "green" : "red" }}>
                      {a.status.toUpperCase()}
                    </b>
                  </td>

                  <td>
                    {a.isEditing ? (
                      <>
                        <button onClick={() => saveEdit(a)}>Save</button>{" "}
                        <button
                          onClick={() =>
                            setAssigned((prev) =>
                              prev.map((r) =>
                                r.id === a.id
                                  ? { ...r, isEditing: false }
                                  : r
                              )
                            )
                          }
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() =>
                            setAssigned((prev) =>
                              prev.map((r) =>
                                r.id === a.id
                                  ? { ...r, isEditing: true }
                                  : r
                              )
                            )
                          }
                        >
                          Edit
                        </button>{" "}
                        <button onClick={() => toggleStatus(a)}>
                          {a.status === "active" ? "Pause" : "Activate"}
                        </button>
                      </>
                    )}
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

const toastStyle = {
  position: "fixed",
  top: 20,
  right: 20,
  background: "#111827",
  color: "#fff",
  padding: "10px 16px",
  borderRadius: 6,
  zIndex: 9999,
};
