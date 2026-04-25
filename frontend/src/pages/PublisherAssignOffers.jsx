import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

// ✅ Styles moved outside to prevent re-creation on every render
const thStyle = { textAlign: "center", padding: 10, whiteSpace: "nowrap", background: "#f3f4f6" };
const tdStyle = { textAlign: "center", padding: 10, verticalAlign: "middle" };
const toastStyle = {
  position: "fixed", top: 20, right: 20, background: "#111827",
  color: "#fff", padding: "10px 16px", borderRadius: 6, zIndex: 9999,
};

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
    offer_id: "", publisher_cpa: "", daily_cap: "", pass_percent: 100, weight: 100,
  });

  const [editingId, setEditingId] = useState(null);
  const [editRow, setEditRow] = useState({});

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const parseNumber = (value, { allowEmpty = false } = {}) => {
    if (value === "" || value === null || value === undefined) return allowEmpty ? null : NaN;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  };

  const getResponseData = async (res) => {
    try { return await res.json(); } catch { return {}; }
  };

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    loadBaseData();
    const pidFromUrl = searchParams.get("publisherId");
    if (pidFromUrl) {
      setPublisherId(pidFromUrl);
      loadAssigned(pidFromUrl);
    } else {
      loadAssigned();
    }
  }, [token]); // ✅ Added token to dependency

  const loadBaseData = async () => {
    try {
      const [pRes, oRes] = await Promise.all([
        fetch(`${API_BASE}/api/publishers`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/offers`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const pData = await getResponseData(pRes);
      const oData = await getResponseData(oRes);

      if (pRes.ok && pData.status === "SUCCESS") setPublishers(pData.data || []);
      if (oRes.ok) setOffers(Array.isArray(oData) ? oData : (oData.data || []));
    } catch { showToast("Failed to load base data"); }
  };

  const loadAssigned = async (pid = null) => {
    try {
      const url = pid ? `${API_BASE}/api/publishers/${pid}/offers` : `${API_BASE}/api/publishers/offers/all`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await getResponseData(res);
      if (res.ok && data.status === "SUCCESS") setAssigned(data.data || []);
      else setAssigned([]);
    } catch { showToast("Failed to load assigned offers"); }
  };

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

    try {
      const res = await fetch(`${API_BASE}/api/publishers/${publisherId}/offers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await getResponseData(res);
      if (res.ok && data.status === "SUCCESS") {
        showToast("Offer assigned");
        setForm({ offer_id: "", publisher_cpa: "", daily_cap: "", pass_percent: 100, weight: 100 });
        loadAssigned(publisherId);
      } else showToast(data.message || "Assign failed");
    } catch { showToast("Assign failed"); }
  };

  const saveEdit = async (row) => {
    const payload = {
      publisher_cpa: parseNumber(editRow.publisher_cpa),
      daily_cap: parseNumber(editRow.daily_cap, { allowEmpty: true }),
      pass_percent: parseNumber(editRow.pass_percent),
      weight: parseNumber(editRow.weight),
    };

    try {
      const res = await fetch(`${API_BASE}/api/publishers/${row.publisher_id}/offers/${row.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await getResponseData(res);
      if (res.ok && data.status === "SUCCESS") {
        setEditingId(null);
        loadAssigned(publisherId || null);
        showToast("Updated");
      }
    } catch { showToast("Update failed"); }
  };

  const toggleStatus = async (row) => {
    try {
      await fetch(`${API_BASE}/api/publishers/${row.publisher_id}/offers/${row.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: row.status === "active" ? "paused" : "active" }),
      });
      loadAssigned(publisherId || null);
    } catch { showToast("Status update failed"); }
  };

  return (
    <>
      <Navbar />
      {toast && <div style={toastStyle}>{toast}</div>}
      <div style={{ padding: 24 }}>
        <h2>Assign Offers to Publisher</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <select value={publisherId} onChange={(e) => {
            setPublisherId(e.target.value);
            e.target.value ? loadAssigned(e.target.value) : loadAssigned();
          }}>
            <option value="">All Publishers</option>
            {publishers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {publisherId && (
            <>
              <select value={form.offer_id} onChange={(e) => setForm({ ...form, offer_id: e.target.value })}>
                <option value="">Select Offer</option>
                {offers.map(o => <option key={o.id} value={o.id}>{o.service_name} | {o.geo}</option>)}
              </select>
              <input type="number" placeholder="CPA" value={form.publisher_cpa} onChange={(e) => setForm({ ...form, publisher_cpa: e.target.value })} />
              <button onClick={assignOffer}>Assign</button>
            </>
          )}
        </div>

        <table width="100%" border="1" cellPadding="8" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {!publisherId && <th style={thStyle}>Publisher</th>}
              <th style={thStyle}>Offer</th>
              <th style={thStyle}>Geo</th>
              <th style={thStyle}>CPA</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assigned.map((a) => (
              <tr key={a.id}>
                {!publisherId && <td style={tdStyle}>{a.publisher_name}</td>}
                <td style={tdStyle}>{a.name}</td>
                <td style={tdStyle}>{a.geo}</td>
                <td style={tdStyle}>
                  {editingId === a.id ? 
                    <input type="number" value={editRow.publisher_cpa} onChange={(e) => setEditRow({...editRow, publisher_cpa: e.target.value})} /> 
                    : a.publisher_cpa}
                </td>
                <td style={{ ...tdStyle, color: a.status === "active" ? "green" : "red" }}>{a.status.toUpperCase()}</td>
                <td style={tdStyle}>
                  {editingId === a.id ? <button onClick={() => saveEdit(a)}>Save</button> : <button onClick={() => { setEditingId(a.id); setEditRow(a); }}>Edit</button>}
                  <button onClick={() => toggleStatus(a)}>{a.status === "active" ? "Pause" : "Activate"}</button>
                  <button onClick={() => window.open(`${API_BASE}/api/publisher/${a.publisher_id}/offer/${a.offer_id}/docs`, "_blank")}>📄 Docs</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
