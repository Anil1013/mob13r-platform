import { useEffect, useState, Fragment } from "react";
import { useNavigate, useSearchParams, NavLink } from "react-router-dom";
import CpaLayout from "../../components/cpa/CpaLayout";
import TableStateRow from "../../components/TableState.jsx";
import { btn, btnRed, input, table, th, td, badge, pageTitle, filterBar, filterSelect } from "../../styles/shared.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";
const CURRENCIES = ["USD", "INR", "EUR", "AED", "SAR", "IQD", "KWD", "JOD", "EGP"];

function isValidUrl(v) {
  if (!v || !v.trim()) return false;
  return /^https?:\/\/.+/i.test(v.trim());
}

const emptyForm = { vertical_id: "", advertiser_id: "", name: "", destination_url: "", payout: "", currency: "USD", geo: "", carrier: "", daily_cap: "" };

export default function Campaigns() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = localStorage.getItem("token");
  const [campaigns, setCampaigns] = useState([]);
  const [verticals, setVerticals] = useState([]);
  const [advertisers, setAdvertisers] = useState([]);
  const [carrierOptions, setCarrierOptions] = useState([]);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState({ vertical_id: searchParams.get("vertical_id") || "", advertiser_id: "", status: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    const vid = searchParams.get("vertical_id") || "";
    const openNew = searchParams.get("new") === "1";
    setFilters(f => ({ ...f, vertical_id: vid }));
    load({ vertical_id: vid, advertiser_id: "", status: "" });
    loadVerticals();
    loadAdvertisers();
    if (openNew) {
      setForm(f => ({ ...f, vertical_id: vid }));
      setShowForm(true);
    }
  }, [searchParams.get("vertical_id")]);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2800); };
  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const load = async (f = filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.vertical_id) params.set("vertical_id", f.vertical_id);
      if (f.advertiser_id) params.set("advertiser_id", f.advertiser_id);
      if (f.status) params.set("status", f.status);
      const res = await fetch(`${API_BASE}/api/campaigns?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === "SUCCESS") setCampaigns(data.data);
      else showToast(data.message || "Failed to load campaigns", "error");
    } catch {
      showToast("Network error while loading campaigns", "error");
    } finally {
      setLoading(false);
    }
  };
  const loadVerticals = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/verticals?active_only=true`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === "SUCCESS") setVerticals(data.data);
    } catch { /* silent — non-blocking */ }
  };
  const loadAdvertisers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/advertisers`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setAdvertisers(data.filter(a => a.status !== "inactive"));
    } catch { /* silent — non-blocking */ }
  };
  const loadCarriers = async (geo) => {
    if (!geo || !geo.trim()) { setCarrierOptions([]); return; }
    try {
      const res = await fetch(`${API_BASE}/api/carrier-prefixes?geo=${encodeURIComponent(geo.trim())}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === "SUCCESS") setCarrierOptions([...new Set(data.data.map(c => c.carrier))]);
    } catch { /* datalist just stays empty, carrier field remains free text */ }
  };

  const validate = (f) => {
    if (!f.vertical_id) return "Select a vertical";
    if (!f.advertiser_id) return "Select an advertiser";
    if (!f.name || !f.name.trim()) return "Campaign name is required";
    if (!isValidUrl(f.destination_url)) return "Destination URL must start with http:// or https://";
    if (f.payout !== "" && (isNaN(Number(f.payout)) || Number(f.payout) < 0)) return "Payout must be a positive number";
    if (f.daily_cap !== "" && f.daily_cap !== null && (isNaN(Number(f.daily_cap)) || Number(f.daily_cap) < 1 || !Number.isInteger(Number(f.daily_cap)))) return "Daily cap must be a whole number ≥ 1";
    return null;
  };

  const createCampaign = async () => {
    const err = validate(form);
    if (err) return showToast(err, "error");
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/campaigns`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          destination_url: form.destination_url.trim(),
          geo: form.geo.trim().toUpperCase(),
          carrier: form.carrier.trim(),
          currency: form.currency.trim().toUpperCase() || "USD",
          payout: Number(form.payout) || 0,
          daily_cap: form.daily_cap ? Number(form.daily_cap) : null,
        }),
      });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        setCampaigns(c => [data.data, ...c]);
        setForm(emptyForm);
        setShowForm(false);
        showToast("Campaign created — tracking URL ready to push to advertiser");
      } else {
        showToast(data.message || "Failed to create campaign", "error");
      }
    } catch {
      showToast("Network error while creating campaign", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (c) => {
    const ns = c.status === "active" ? "paused" : "active";
    const prev = campaigns;
    setCampaigns(l => l.map(x => x.id === c.id ? { ...x, status: ns } : x));
    try {
      const res = await fetch(`${API_BASE}/api/campaigns/${c.id}/status`, {
        method: "PATCH", headers: authHeaders,
        body: JSON.stringify({ status: ns }),
      });
      if (!res.ok) { setCampaigns(prev); showToast("Failed to update status", "error"); }
    } catch {
      setCampaigns(prev);
      showToast("Network error while updating status", "error");
    }
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setExpandedId(null);
    setEditForm({ name: c.name, destination_url: c.destination_url, payout: c.payout, currency: c.currency, geo: c.geo || "", carrier: c.carrier || "", daily_cap: c.daily_cap ?? "" });
  };
  const cancelEdit = () => { setEditingId(null); setEditForm(null); };

  const saveEdit = async (id) => {
    if (!editForm.name || !editForm.name.trim()) return showToast("Campaign name is required", "error");
    if (!isValidUrl(editForm.destination_url)) return showToast("Destination URL must start with http:// or https://", "error");
    if (editForm.payout !== "" && (isNaN(Number(editForm.payout)) || Number(editForm.payout) < 0)) return showToast("Payout must be a positive number", "error");
    if (editForm.daily_cap !== "" && (isNaN(Number(editForm.daily_cap)) || Number(editForm.daily_cap) < 1 || !Number.isInteger(Number(editForm.daily_cap)))) return showToast("Daily cap must be a whole number ≥ 1", "error");

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/campaigns/${id}`, {
        method: "PATCH", headers: authHeaders,
        body: JSON.stringify({
          name: editForm.name.trim(),
          destination_url: editForm.destination_url.trim(),
          geo: editForm.geo.trim().toUpperCase(),
          carrier: editForm.carrier.trim(),
          currency: editForm.currency.trim().toUpperCase() || "USD",
          payout: Number(editForm.payout) || 0,
          daily_cap: editForm.daily_cap === "" ? null : Number(editForm.daily_cap),
        }),
      });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        setCampaigns(l => l.map(x => x.id === id ? data.data : x));
        cancelEdit();
        showToast("Campaign updated");
      } else {
        showToast(data.message || "Failed to update campaign", "error");
      }
    } catch {
      showToast("Network error while updating campaign", "error");
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = async (url, label = "URL") => {
    try { await navigator.clipboard.writeText(url); showToast(`${label} copied!`); }
    catch { showToast("Could not copy — please copy manually", "error"); }
  };

  const applyFilters = () => load(filters);

  return (
    <CpaLayout>
      {toast && <div style={{ position: "fixed", top: 80, right: 24, zIndex: 9999, background: toast.type === "error" ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)", border: `1px solid ${toast.type === "error" ? "#fca5a5" : "#86efac"}`, color: toast.type === "error" ? "#dc2626" : "#16a34a", padding: "12px 20px", borderRadius: 12, fontSize: 13, maxWidth: 360 }}>{toast.msg}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={pageTitle}>CPA Campaigns</h1>
          <p style={{ color: "#9b7faa", fontSize: 13 }}>{campaigns.length} campaigns · single tracking URL per campaign, pushed to advertiser</p>
        </div>
        <button className="m13-btn" style={btn} onClick={() => setShowForm(s => !s)}>{showForm ? "Cancel" : "+ New Campaign"}</button>
      </div>

      {showForm && (
        <div style={{ background: "#fff", border: "1px solid #e8d0dc", borderRadius: 16, padding: 20, marginBottom: 24, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          <select style={input} value={form.vertical_id} onChange={e => setForm(f => ({ ...f, vertical_id: e.target.value }))}>
            <option value="">Select Vertical *</option>
            {verticals.map(v => <option key={v.id} value={v.id}>{v.icon} {v.name}</option>)}
          </select>
          <select style={input} value={form.advertiser_id} onChange={e => setForm(f => ({ ...f, advertiser_id: e.target.value }))}>
            <option value="">Select Advertiser *</option>
            {advertisers.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input style={input} placeholder="Campaign name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input style={{ ...input, gridColumn: "span 3" }} placeholder="Destination URL * — must start with http(s):// — use {click_id} {aff_id} {sub1} {payout} {geo} macros" value={form.destination_url} onChange={e => setForm(f => ({ ...f, destination_url: e.target.value }))} />
          <input style={input} placeholder="Payout" type="number" min="0" step="0.01" value={form.payout} onChange={e => setForm(f => ({ ...f, payout: e.target.value }))} />
          <select style={input} value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input style={input} placeholder="Geo (e.g. IQ)" maxLength={10} value={form.geo} onChange={e => setForm(f => ({ ...f, geo: e.target.value }))} onBlur={e => loadCarriers(e.target.value)} />
          <input style={input} placeholder="Carrier (e.g. Zain)" list="carrier-options" maxLength={100} value={form.carrier} onChange={e => setForm(f => ({ ...f, carrier: e.target.value }))} />
          <datalist id="carrier-options">
            {carrierOptions.map(c => <option key={c} value={c} />)}
          </datalist>
          <input style={{ ...input, gridColumn: "span 2" }} placeholder="Daily cap (optional, whole number)" type="number" min="1" step="1" value={form.daily_cap} onChange={e => setForm(f => ({ ...f, daily_cap: e.target.value }))} />
          <button style={{ ...btn, gridColumn: "span 3", opacity: saving ? 0.7 : 1 }} onClick={createCampaign} disabled={saving}>{saving ? "Creating..." : "Create Campaign & Generate Tracking URL"}</button>
        </div>
      )}

      <div style={{ ...filterBar, marginBottom: 14 }}>
        <select style={filterSelect} value={filters.vertical_id} onChange={e => setFilters(f => ({ ...f, vertical_id: e.target.value }))}>
          <option value="">All Verticals</option>
          {verticals.map(v => <option key={v.id} value={v.id}>{v.icon} {v.name}</option>)}
        </select>
        <select style={filterSelect} value={filters.advertiser_id} onChange={e => setFilters(f => ({ ...f, advertiser_id: e.target.value }))}>
          <option value="">All Advertisers</option>
          {advertisers.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select style={filterSelect} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
        </select>
        <button style={btn} onClick={applyFilters} disabled={loading}>{loading ? "Loading..." : "Apply"}</button>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e8d0dc", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Campaign</th>
                <th style={th}>Vertical</th>
                <th style={th}>Advertiser</th>
                <th style={th}>Geo / Carrier</th>
                <th style={th}>Tracking URL</th>
                <th style={th}>Payout</th>
                <th style={th}>Today (Clicks/Conv)</th>
                <th style={th}>Status</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <Fragment key={c.id}>
                {editingId === c.id ? (
                  <tr>
                    <td style={td} colSpan={9}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                        <input style={input} placeholder="Campaign name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                        <input style={{ ...input, gridColumn: "span 2" }} placeholder="Destination URL" value={editForm.destination_url} onChange={e => setEditForm(f => ({ ...f, destination_url: e.target.value }))} />
                        <input style={input} placeholder="Payout" type="number" min="0" step="0.01" value={editForm.payout} onChange={e => setEditForm(f => ({ ...f, payout: e.target.value }))} />
                        <select style={input} value={editForm.currency} onChange={e => setEditForm(f => ({ ...f, currency: e.target.value }))}>
                          {CURRENCIES.map(cur => <option key={cur} value={cur}>{cur}</option>)}
                        </select>
                        <input style={input} placeholder="Geo" maxLength={10} value={editForm.geo} onChange={e => setEditForm(f => ({ ...f, geo: e.target.value }))} onBlur={e => loadCarriers(e.target.value)} />
                        <input style={input} placeholder="Carrier" list="carrier-options" maxLength={100} value={editForm.carrier} onChange={e => setEditForm(f => ({ ...f, carrier: e.target.value }))} />
                        <input style={input} placeholder="Daily cap" type="number" min="1" step="1" value={editForm.daily_cap} onChange={e => setEditForm(f => ({ ...f, daily_cap: e.target.value }))} />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button style={{ ...btn, opacity: saving ? 0.7 : 1 }} disabled={saving} onClick={() => saveEdit(c.id)}>{saving ? "Saving..." : "Save"}</button>
                          <button style={btnRed} onClick={cancelEdit}>Cancel</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                <tr>
                  <td style={td}>
                    {c.name}
                    <button style={{ ...btn, padding: "2px 8px", fontSize: 10, marginLeft: 8, background: "#f5eef8", color: "#9b7faa" }}
                      onClick={() => setExpandedId(id => id === c.id ? null : c.id)}>
                      {expandedId === c.id ? "▲ Postback" : "▼ Postback"}
                    </button>
                  </td>
                  <td style={td}>{c.vertical_code || c.vertical_name}</td>
                  <td style={td}>{c.advertiser_name}</td>
                  <td style={td}>{c.geo || "—"} {c.carrier ? `/ ${c.carrier}` : ""}</td>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <code style={{ fontSize: 11, background: "#f5eef8", padding: "3px 8px", borderRadius: 6, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.tracking_url}</code>
                      <button style={{ ...btn, padding: "4px 10px", fontSize: 11 }} onClick={() => copyUrl(c.tracking_url, "Tracking URL")}>Copy</button>
                    </div>
                  </td>
                  <td style={td}>{c.currency} {c.payout}</td>
                  <td style={td}>{c.today_clicks || 0} / {c.today_conversions || 0}</td>
                  <td style={td}>
                    <span style={badge(c.status === "active" ? "green" : "red")} onClick={() => toggleStatus(c)} title="Click to toggle">
                      {c.status === "active" ? "● Active" : "● Paused"}
                    </span>
                  </td>
                  <td style={td}>
                    <button style={{ ...btn, padding: "4px 10px", fontSize: 11 }} onClick={() => startEdit(c)}>Edit</button>
                  </td>
                </tr>
                )}
                {expandedId === c.id && (
                  <tr>
                    <td style={{ ...td, background: "#fdf6f9" }} colSpan={9}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#9b7faa", textTransform: "uppercase", marginBottom: 6 }}>
                        Advertiser postback
                      </div>
                      <div style={{ fontSize: 12, color: "#4a2f3f" }}>
                        <b>{c.advertiser_name}</b> has one dedicated postback URL used for every campaign they run.
                        Go to <NavLink to="/cpa/advertisers" style={{ color: "#e8856a", fontWeight: 700 }}>Advertisers</NavLink> → find {c.advertiser_name} → "Show URL" to copy it.
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
              {!campaigns.length && (
                <TableStateRow colSpan={9} loading={loading} loadingText="Loading campaigns..." emptyText="No campaigns yet — create one to get your first tracking URL." emptyIcon="🚀" />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </CpaLayout>
  );
}
