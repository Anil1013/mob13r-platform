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
  const [emailModal, setEmailModal] = useState(null); // { publisher_id, offer_id, publisher_name, offer_name, email }
  const [emailTo, setEmailTo] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState(null);
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

  const sendEmail = async () => {
    if (!emailTo || !emailTo.includes("@")) {
      setEmailResult({ ok: false, msg: "Valid email required" });
      return;
    }
    setEmailSending(true);
    setEmailResult(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/email/send-docs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          publisher_id: emailModal.publisher_id,
          offer_id: emailModal.offer_id,
          to_email: emailTo,
          custom_message: emailMsg,
        }),
      });
      const d = await res.json();
      if (d.status === "SUCCESS") {
        setEmailResult({ ok: true, msg: `✅ Email sent to ${emailTo}` });
        setTimeout(() => { setEmailModal(null); setEmailResult(null); setEmailTo(""); setEmailMsg(""); }, 2000);
      } else {
        setEmailResult({ ok: false, msg: d.error || "Failed to send email" });
      }
    } catch (e) {
      setEmailResult({ ok: false, msg: e.message });
    }
    setEmailSending(false);
  };

  return (
    <>
      <Navbar />
      <EmailModal />
      {toast && <div style={styles.toast}>{toast}</div>}

      <div style={page}>
        <h2 style={{fontFamily:"Lora,serif",fontSize:24,fontWeight:700,color:"#1e293b",marginBottom:20}}>
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
                {offers.filter(o => {
                  // Hide already assigned offers for selected publisher
                  if (!publisherId) return true;
                  return !assigned.some(a => a.offer_id === o.id && String(a.publisher_id) === String(publisherId));
                }).map((o) => (
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
                  {!publisherId && <th style={{...th, whiteSpace:"nowrap"}}>Publisher</th>}
                  <th style={{...th, whiteSpace:"nowrap"}}>Offer (Original)</th>
                  <th style={{...th, whiteSpace:"nowrap"}}>Pub Offer Name</th>
                  <th style={{...th, whiteSpace:"nowrap"}}>Geo</th>
                  <th style={{...th, whiteSpace:"nowrap"}}>Carrier</th>
                  <th style={{...th, whiteSpace:"nowrap"}}>CPA</th>
                  <th style={{...th, whiteSpace:"nowrap"}}>Cap</th>
                  <th style={{...th, whiteSpace:"nowrap"}}>Pass %</th>
                  <th style={{...th, whiteSpace:"nowrap"}}>Weight</th>
                  <th style={{...th, whiteSpace:"nowrap"}}>Status</th>
                  <th style={{...th, whiteSpace:"nowrap"}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assigned.map((a) => (
                  <tr key={a.id}>
                    {!publisherId && <td style={{...td, color:"#1e293b", fontWeight:500, whiteSpace:"nowrap"}}>{a.publisher_name}</td>}
                    <td style={{...td, color:"#64748b", fontSize:12, whiteSpace:"nowrap"}}>{a.original_name || a.name}</td>
                    <td style={{...td, color:"#1e293b", fontWeight:500, whiteSpace:"nowrap"}}>
                      {editingId === a.id ? (
                        <input
                          style={styles.cellInput}
                          type="text"
                          placeholder="Custom name..."
                          size={Math.max(String(editRow.pub_offer_name || "").length, 10)}
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
                    <td style={{...td, whiteSpace:"nowrap"}}>{a.geo}</td>
                    <td style={{...td, whiteSpace:"nowrap"}}>{a.carrier}</td>

                    {editingId === a.id ? (
                      <>
                        <td style={td}>
                          <input
                            style={styles.cellInput}
                            type="number"
                            step="0.01"
                            min="0"
                            size={Math.max(String(editRow.publisher_cpa ?? "").length, 4)}
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
                            size={Math.max(String(editRow.daily_cap || "").length, 4)}
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
                            size={Math.max(String(editRow.pass_percent ?? "").length, 3)}
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
                            size={Math.max(String(editRow.weight ?? "").length, 3)}
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
                        <td style={{...td, whiteSpace:"nowrap"}}>{a.publisher_cpa}</td>
                        <td style={{...td, whiteSpace:"nowrap"}}>{a.daily_cap || "∞"}</td>
                        <td style={{...td, whiteSpace:"nowrap"}}>{a.pass_percent}</td>
                        <td style={{...td, whiteSpace:"nowrap"}}>{a.weight}</td>
                      </>
                    )}

                    <td
                      style={{
                        ...td,
                        color: a.status === "active" ? "#16a34a" : "#dc2626",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
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
                        onClick={async () => {
                          if (!a.publisher_id || !a.offer_id) {
                            alert("Missing publisher or offer ID");
                            return;
                          }
                          try {
                            const res = await fetch(`${API_BASE}/api/publisher/${a.publisher_id}/offer/${a.offer_id}/docs-link`, {
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            const data = await res.json();
                            if (!res.ok) { alert(data.error || "Failed to generate docs link"); return; }
                            window.open(data.html_url, "__blank");
                          } catch { alert("Network error while generating docs link"); }
                        }}
                      >
                        📄 API Docs
                      </button>

                      <button
                        style={{...styles.smallBtn, marginLeft: 6, background:"rgba(220,38,38,0.06)", borderColor:"rgba(220,38,38,0.2)", color:"#dc2626"}}
                        onClick={async () => {
                          if (!a.publisher_id || !a.offer_id) {
                            alert("Missing publisher or offer ID");
                            return;
                          }
                          try {
                            const res = await fetch(`${API_BASE}/api/publisher/${a.publisher_id}/offer/${a.offer_id}/docs-link`, {
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            const data = await res.json();
                            if (!res.ok) { alert(data.error || "Failed to generate docs link"); return; }
                            window.open(data.pdf_url, "__blank");
                          } catch { alert("Network error while generating docs link"); }
                        }}
                      >
                        📥 PDF
                      </button>

                      <button
                        style={{...styles.smallBtn, marginLeft: 6, background:"rgba(34,197,94,0.06)", borderColor:"rgba(34,197,94,0.2)", color:"#16a34a"}}
                        onClick={() => {
                          setEmailModal({
                            publisher_id: a.publisher_id,
                            offer_id: a.offer_id,
                            publisher_name: a.publisher_name,
                            offer_name: a.pub_offer_name || a.name,
                          });
                          setEmailTo(a.publisher_email || "");
                          setEmailMsg("");
                          setEmailResult(null);
                        }}
                      >
                        📧 Email
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

  // ======= EMAIL MODAL =======
  function EmailModal() {
    if (!emailModal) return null;
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
        onClick={e => { if (e.target === e.currentTarget) setEmailModal(null); }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
          <h3 style={{ margin: "0 0 4px", color: "#1e293b" }}>📧 Send API Docs via Email</h3>
          <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 13 }}>
            {emailModal.publisher_name} — {emailModal.offer_name}
          </p>
          <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Recipient Email *</label>
          <input
            style={{ display: "block", width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, marginTop: 6, marginBottom: 14, boxSizing: "border-box" }}
            type="email" placeholder="publisher@example.com"
            value={emailTo} onChange={e => setEmailTo(e.target.value)}
          />
          <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Custom Message (optional)</label>
          <textarea
            style={{ display: "block", width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, marginTop: 6, marginBottom: 14, boxSizing: "border-box", resize: "vertical", minHeight: 80 }}
            placeholder="Add a personal note..."
            value={emailMsg} onChange={e => setEmailMsg(e.target.value)}
          />
          {emailResult && (
            <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13, background: emailResult.ok ? "#dcfce7" : "#fee2e2", color: emailResult.ok ? "#16a34a" : "#dc2626" }}>
              {emailResult.msg}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: 14 }}
              onClick={() => setEmailModal(null)}>Cancel</button>
            <button
              style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: emailSending ? "#94a3b8" : "#16a34a", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
              onClick={sendEmail} disabled={emailSending}>
              {emailSending ? "Sending…" : "📧 Send Email"}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

/* ================= STYLES ================= */
const styles = {
  formBar: { display: "flex", gap: 10, marginBottom: 20, flexWrap:"wrap", alignItems:"center", background:"#ffffff", border:"1px solid #e2e8f0", padding:16, borderRadius:16, boxShadow:"0 1px 3px rgba(0,0,0,0.05)" },
  select: { background:"#ffffff", border:"1px solid #cbd5e1", color:"#1e293b", borderRadius:10, padding:"8px 12px", fontSize:13, outline:"none" },
  smallInput: { background:"#ffffff", border:"1px solid #cbd5e1", color:"#1e293b", borderRadius:10, padding:"8px 12px", fontSize:13, outline:"none", width:90 },
  cellInput: { background:"#ffffff", border:"1px solid #cbd5e1", color:"#1e293b", borderRadius:8, padding:"6px 8px", fontSize:13, outline:"none", textAlign:"center" },
  smallBtn: { fontSize:11, padding:"6px 10px", background:"#ffffff", border:"1px solid #cbd5e1", color:"#475569", borderRadius:8, cursor:"pointer" },
  toast: { position:"fixed", top:80, right:24, background:"#ffffff", border:"1px solid #cbd5e1", color:"#1e293b", padding:"12px 20px", borderRadius:12, zIndex:9999, fontSize:13, boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)" },
};
