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

  const parseNumber = (value, { allowEmpty = false } = {}) => {
    if (value === "" || value === null || value === undefined) {
      return allowEmpty ? null : NaN;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  };

  const getResponseData = async (res) => {
    try {
      return await res.json();
    } catch {
      return {};
    }
  };

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

      const pData = await getResponseData(pRes);
      const oData = await getResponseData(oRes);

      if (pRes.ok && pData.status === "SUCCESS") setPublishers(pData.data || []);
      else setPublishers([]);

      if (oRes.ok && Array.isArray(oData)) setOffers(oData);
      else if (oRes.ok && oData.status === "SUCCESS") setOffers(oData.data || []);
      else setOffers([]);
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

      const data = await getResponseData(res);
      if (res.ok && data.status === "SUCCESS") {
        setAssigned(data.data || []);
      } else {
        setAssigned([]);
        showToast(data.message || "Failed to load assigned offers");
      }
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

    const payload = {
      offer_id: parseNumber(form.offer_id),
      publisher_cpa: parseNumber(form.publisher_cpa),
      daily_cap: parseNumber(form.daily_cap, { allowEmpty: true }),
      pass_percent: parseNumber(form.pass_percent),
      weight: parseNumber(form.weight),
    };

    if (
      Number.isNaN(payload.offer_id) ||
      Number.isNaN(payload.publisher_cpa) ||
      Number.isNaN(payload.pass_percent) ||
      Number.isNaN(payload.weight)
    ) {
      showToast("Please enter valid numeric values");
      return;
    }

    if (payload.pass_percent < 0 || payload.pass_percent > 100) {
      showToast("Pass % must be between 0 and 100");
      return;
    }

    if (payload.weight < 1) {
      showToast("Weight must be at least 1");
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
          body: JSON.stringify(payload),
        }
      );

      const data = await getResponseData(res);
      if (res.ok && data.status === "SUCCESS") {
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
      showToast("Assign failed");
    }
  };

  /* ================= SAVE EDIT ================= */
  const saveEdit = async (row) => {
    const payload = {
      publisher_cpa: parseNumber(editRow.publisher_cpa),
      daily_cap: parseNumber(editRow.daily_cap, { allowEmpty: true }),
      pass_percent: parseNumber(editRow.pass_percent),
      weight: parseNumber(editRow.weight),
    };

    if (
      Number.isNaN(payload.publisher_cpa) ||
      Number.isNaN(payload.pass_percent) ||
      Number.isNaN(payload.weight)
    ) {
      showToast("Please enter valid numeric values");
      return;
    }

    if (payload.pass_percent < 0 || payload.pass_percent > 100) {
      showToast("Pass % must be between 0 and 100");
      return;
    }

    if (payload.weight < 1) {
      showToast("Weight must be at least 1");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/publishers/${row.publisher_id}/offers/${row.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await getResponseData(res);
      if (!res.ok || data.status !== "SUCCESS") {
        showToast(data.message || "Update failed");
        return;
      }

      setEditingId(null);
      loadAssigned(publisherId || null);
      showToast("Updated");
    } catch {
      showToast("Update failed");
    }
  };

  /* ================= TOGGLE STATUS ================= */
  const toggleStatus = async (row) => {
    try {
      const res = await fetch(
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

      const data = await getResponseData(res);
      if (!res.ok || data.status !== "SUCCESS") {
        showToast(data.message || "Status update failed");
        return;
      }

      loadAssigned(publisherId || null);
    } catch {
      showToast("Status update failed");
    }
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
                type="number"
                step="0.01"
                min="0"
                placeholder="CPA"
                value={form.publisher_cpa}
                onChange={(e) =>
                  setForm({ ...form, publisher_cpa: e.target.value })
                }
              />
              <input
                type="number"
                min="0"
                placeholder="Cap"
                value={form.daily_cap}
                onChange={(e) =>
                  setForm({ ...form, daily_cap: e.target.value })
                }
              />
              <input
                type="number"
                min="0"
                max="100"
                placeholder="Pass %"
                value={form.pass_percent}
                onChange={(e) =>
                  setForm({ ...form, pass_percent: e.target.value })
                }
              />
              <input
                type="number"
                min="1"
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
                        type="number"
                        step="0.01"
                        min="0"
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
                        type="number"
                        min="0"
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
                        type="number"
                        min="0"
                        max="100"
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
                        type="number"
                        min="1"
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

  {/* 🔥 NEW: API DOCS BUTTON */}
  <button
    style={{ marginLeft: 6 }}
    onClick={() => {
      if (!a.publisher_id || !a.offer_id) {
        alert("Missing publisher or offer ID");
        return;
      }

      window.open(
        `${API_BASE}/api/publisher/${a.publisher_id}/offer/${a.offer_id}/docs`,
        "_blank"
      );
    }}
  >
    📄 API Docs
  </button>
</td>

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
