import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { btn, btnRed, input, table, th, td, page } from "../styles/shared.js";

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
    pub_offer_name: "",
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
      pub_offer_name: form.pub_offer_name || null,
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
          pub_offer_name: "",
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
      pub_offer_name: editRow.pub_offer_name || null,
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
      {toast && <div style={styles.toast}>{toast}</div>}

      <div style={page}>
        <h2 style={{fontFamily:"Syne,sans-serif",fontSize:24,fontWeight:700,color:"#1e293b",marginBottom:20}}>
          Assign Offers to Publisher
        </h2>

        {/* SELECT + ASSIGN LINE */}
        <div style={styles.formBar}>
          <select
            style={styles.select}
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
                style={styles.select}
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
                style={{...styles.smallInput, minWidth: "140px"}}
                type="text"
                placeholder="Offer Name (Publisher ke liye)"
                value={form.pub_offer_name}
                onChange={(e) =>
                  setForm({ ...form, pub_offer_name: e.target.value })
                }
              />
              <input
                style={styles.smallInput}
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
                style={styles.smallInput}
                type="number"
                min="0"
                placeholder="Cap"
                value={form.daily_cap}
                onChange={(e) =>
                  setForm({ ...form, daily_cap: e.target.value })
                }
              />
              <input
                style={styles.smallInput}
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
                style={styles.smallInput}
                type="number"
                min="1"
                placeholder="Weight"
                value={form.weight}
                onChange={(e) =>
                  setForm({ ...form, weight: e.target.value })
                }
              />
              <button onClick={assignOffer} style={btn}>Assign</button>
            </>
          )}
        </div>

        {/* TABLE */}
        <div style={{background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:16, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
          <div style={{overflowX:"auto"}}>
            <table style={table}>
              <thead>
                <tr>
                  {!publisherId && <th style={th}>Publisher</th>}
                  <th style={th}>Offer (Original)</th>
                  <th style={th}>Pub Offer Name</th>
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
                    {!publisherId && <td style={{...td, color:"#1e293b", fontWeight:500}}>{a.publisher_name}</td>}
                    <td style={{...td, color:"#64748b", fontSize:12}}>{a.original_name || a.name}</td>
                    <td style={{...td, color:"#1e293b", fontWeight:500}}>
                      {editingId === a.id ? (
                        <input
                          style={styles.cellInput}
                          type="text"
                          placeholder="Custom name..."
                          value={editRow.pub_offer_name || ""}
                          onChange={(e) => setEditRow({ ...editRow, pub_offer_name: e.target.value })}
                        />
                      ) : (
                        <span style={{color: a.pub_offer_name ? "#16a34a" : "#94a3b8"}}>
                          {a.pub_offer_name || a.name}
                          {a.pub_offer_name && <span style={{fontSize:10, marginLeft:4, color:"#16a34a"}}>✎ custom</span>}
                        </span>
                      )}
                    </td>
                    <td style={td}>{a.geo}</td>
                    <td style={td}>{a.carrier}</td>

                    {editingId === a.id ? (
                      <>
                        <td style={td}>
                          <input
                            style={styles.cellInput}
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
                            style={styles.cellInput}
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
                            style={styles.cellInput}
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
                            style={styles.cellInput}
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
                        color: a.status === "active" ? "#16a34a" : "#dc2626",
                        fontWeight: 600,
                      }}
                    >
                      {a.status.toUpperCase()}
                    </td>

                    <td style={{...td, whiteSpace:"nowrap"}}>
                      {editingId === a.id ? (
                        <button onClick={() => saveEdit(a)} style={styles.smallBtn}>Save</button>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(a.id);
                            setEditRow(a);
                          }}
                          style={styles.smallBtn}
                        >
                          Edit
                        </button>
                      )}
                      <button onClick={() => toggleStatus(a)} style={{...styles.smallBtn, marginLeft:6}}>
                        {a.status === "active" ? "Pause" : "Activate"}
                      </button>

                      <button
                        style={{...styles.smallBtn, marginLeft: 6}}
                        onClick={() => {
                          if (!a.publisher_id || !a.offer_id) {
                            alert("Missing publisher or offer ID");
                            return;
                          }
                          window.open(
                            `${API_BASE}/api/publisher/${a.publisher_id}/offer/${a.offer_id}/docs`,
                            "__blank"
                          );
                        }}
                      >
                        📄 API Docs
                      </button>

                      <button
                        style={{...styles.smallBtn, marginLeft: 6, background:"rgba(220,38,38,0.06)", borderColor:"rgba(220,38,38,0.2)", color:"#dc2626"}}
                        onClick={() => {
                          if (!a.publisher_id || !a.offer_id) {
                            alert("Missing publisher or offer ID");
                            return;
                          }
                          window.open(
                            `${API_BASE}/api/publisher/${a.publisher_id}/offer/${a.offer_id}/download-pdf`,
                            "__blank"
                          );
                        }}
                      >
                        📥 PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

/* ================= STYLES ================= */
const styles = {
  formBar: { display: "flex", gap: 10, marginBottom: 20, flexWrap:"wrap", alignItems:"center", background:"#ffffff", border:"1px solid #e2e8f0", padding:16, borderRadius:16, boxShadow:"0 1px 3px rgba(0,0,0,0.05)" },
  select: { background:"#ffffff", border:"1px solid #cbd5e1", color:"#1e293b", borderRadius:10, padding:"8px 12px", fontSize:13, outline:"none" },
  smallInput: { background:"#ffffff", border:"1px solid #cbd5e1", color:"#1e293b", borderRadius:10, padding:"8px 12px", fontSize:13, outline:"none", width:90 },
  cellInput: { background:"#ffffff", border:"1px solid #cbd5e1", color:"#1e293b", borderRadius:8, padding:"6px 8px", fontSize:13, outline:"none", width:70, textAlign:"center" },
  smallBtn: { fontSize:11, padding:"6px 10px", background:"#ffffff", border:"1px solid #cbd5e1", color:"#475569", borderRadius:8, cursor:"pointer" },
  toast: { position:"fixed", top:80, right:24, background:"#ffffff", border:"1px solid #cbd5e1", color:"#1e293b", padding:"12px 20px", borderRadius:12, zIndex:9999, fontSize:13, boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)" },
};
