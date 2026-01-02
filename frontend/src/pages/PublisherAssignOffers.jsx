import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

export default function PublisherAssignOffers() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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

  const [editingId, setEditingId] = useState(null);
  const [editRow, setEditRow] = useState({});

  /* ================= TOAST ================= */
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  /* ================= AUTH + INIT ================= */
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    loadBaseData();

    const pidFromUrl = searchParams.get("publisherId");
    if (pidFromUrl) {
      setPublisherId(pidFromUrl);
      loadAssigned(pidFromUrl);
    } else {
      loadAssigned();
    }
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
      showToast("Failed to load base data");
    }
  };

  /* ================= LOAD ASSIGNED ================= */
  const loadAssigned = async (pid = null) => {
    try {
      const url = pid
        ? `${API_BASE}/api/publishers/${pid}/offers`
        : `${API_BASE}/api/publishers/offers/all`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setAssigned(data.status === "SUCCESS" ? data.data : []);
    } catch {
      showToast("Failed to load assigned offers");
    }
  };

  /* ================= ASSIGN ================= */
  const assignOffer = async () => {
    if (!publisherId || !form.offer_id || !form.publisher_cpa) {
      showToast("Publisher, Offer & CPA required");
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
  };

  /* ================= SAVE EDIT ================= */
  const saveEdit = async (row) => {
    await fetch(
      `${API_BASE}/api/publishers/${row.publisher_id}/offers/${row.id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          publisher_cpa: Number(editRow.publisher_cpa),
          daily_cap: editRow.daily_cap ? Number(editRow.daily_cap) : null,
          pass_percent: Number(editRow.pass_percent),
          weight: Number(editRow.weight),
        }),
      }
    );

    setEditingId(null);
    loadAssigned(publisherId || null);
    showToast("Updated");
  };

  /* ================= TOGGLE STATUS ================= */
  const toggleStatus = async (row) => {
    await fetch(
      `${API_BASE}/api/publishers/${row.publisher_id}/offers/${row.id}`,
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

    loadAssigned(publisherId || null);
  };

  return (
    <>
      <Navbar />
      {toast && <div style={toastStyle}>{toast}</div>}

      <div style={{ padding: 24 }}>
        <h2>Assign Offers to Publisher</h2>

        {/* SELECT + ASSIGN LINE */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <select
            value={publisherId}
            onChange={(e) => {
              const pid = e.target.value;
              setPublisherId(pid);
              pid ? loadAssigned(pid) : loadAssigned();
            }}
          >
            <option value="">All Publishers</option>
            {publishers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {publisherId && (
            <>
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
            </>
          )}
        </div>

        {/* TABLE */}
        <table
          width="100%"
          border="1"
          cellPadding="8"
          style={{ borderCollapse: "collapse", textAlign: "center" }}
        >
          <thead>
            <tr>
              {!publisherId && <th style={th}>Publisher</th>}
              <th style={th}>Offer</th>
              <th style={th}>Geo</th>
              <th style={th}>Carrier</th>
              <th style={th}>CPA</th>
              <th style={th}>Cap</th>
              <th style={th}>Pass %</th>
              <th style={th}>Weight</th>
              <th style={th}>Status</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assigned.map((a) => (
              <tr key={a.id}>
                {!publisherId && <td style={td}>{a.publisher_name}</td>}
                <td style={td}>{a.name}</td>
                <td style={td}>{a.geo}</td>
                <td style={td}>{a.carrier}</td>

                {editingId === a.id ? (
                  <>
                    <td style={td}>
                      <input
                        value={editRow.publisher_cpa}
                        onChange={(e) =>
                          setEditRow({
                            ...editRow,
                            publisher_cpa: e.target.value,
                          })
                        }
                      />
                    </td>
                    <td style={td}>
                      <input
                        value={editRow.daily_cap || ""}
                        onChange={(e) =>
                          setEditRow({
                            ...editRow,
                            daily_cap: e.target.value,
                          })
                        }
                      />
                    </td>
                    <td style={td}>
                      <input
                        value={editRow.pass_percent}
                        onChange={(e) =>
                          setEditRow({
                            ...editRow,
                            pass_percent: e.target.value,
                          })
                        }
                      />
                    </td>
                    <td style={td}>
                      <input
                        value={editRow.weight}
                        onChange={(e) =>
                          setEditRow({
                            ...editRow,
                            weight: e.target.value,
                          })
                        }
                      />
                    </td>
                  </>
                ) : (
                  <>
                    <td style={td}>{a.publisher_cpa}</td>
                    <td style={td}>{a.daily_cap || "∞"}</td>
                    <td style={td}>{a.pass_percent}</td>
                    <td style={td}>{a.weight}</td>
                  </>
                )}

                <td
                  style={{
                    ...td,
                    color: a.status === "active" ? "green" : "red",
                    fontWeight: 600,
                  }}
                >
                  {a.status.toUpperCase()}
                </td>

                <td style={td}>
                  {editingId === a.id ? (
                    <button onClick={() => saveEdit(a)}>Save</button>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(a.id);
                        setEditRow(a);
                      }}
                    >
                      Edit
                    </button>
                  )}
                  <button onClick={() => toggleStatus(a)}>
                    {a.status === "active" ? "Pause" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ================= STYLES ================= */
const th = {
  textAlign: "center",
  padding: 10,
  whiteSpace: "nowrap",
};

const td = {
  textAlign: "center",
  padding: 10,
  verticalAlign: "middle",
};

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
