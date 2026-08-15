import { useEffect, useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import CpaLayout from "../../components/cpa/CpaLayout";
import { btn, input, table, th, td, badge, pageTitle } from "../../styles/shared.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

// This is OUR postback URL — give this to the advertiser so THEY notify US of conversions.
function buildAdvertiserPostbackUrl() {
  return `${API_BASE}/postback?click_id={click_id}&status=approved&payout={payout}&transaction_id={transaction_id}`;
}

export default function Campaigns() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [campaigns, setCampaigns] = useState([]);
  const [verticals, setVerticals] = useState([]);
  const [advertisers, setAdvertisers] = useState([]);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({ vertical_id: "", advertiser_id: "", name: "", destination_url: "", payout: "", currency: "USD", geo: "", daily_cap: "" });

  useEffect(() => { if (!token) navigate("/login"); else { load(); loadVerticals(); loadAdvertisers(); } }, []);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2800); };

  const load = async () => {
    const res = await fetch(`${API_BASE}/api/campaigns`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.status === "SUCCESS") setCampaigns(data.data);
  };
  const loadVerticals = async () => {
    const res = await fetch(`${API_BASE}/api/verticals?active_only=true`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.status === "SUCCESS") setVerticals(data.data);
  };
  const loadAdvertisers = async () => {
    const res = await fetch(`${API_BASE}/api/advertisers`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (Array.isArray(data)) setAdvertisers(data);
  };

  const createCampaign = async () => {
    if (!form.vertical_id || !form.advertiser_id || !form.name || !form.destination_url) {
      return showToast("Vertical, Advertiser, Name and Destination URL required", "error");
    }
    setSaving(true);
    const res = await fetch(`${API_BASE}/api/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, payout: Number(form.payout) || 0, daily_cap: form.daily_cap ? Number(form.daily_cap) : null }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.status === "SUCCESS") {
      setCampaigns(c => [data.data, ...c]);
      setForm({ vertical_id: "", advertiser_id: "", name: "", destination_url: "", payout: "", currency: "USD", geo: "", daily_cap: "" });
      setShowForm(false);
      showToast("Campaign created — tracking URL ready to push to advertiser");
    } else {
      showToast(data.message || "Failed to create campaign", "error");
    }
  };

  const toggleStatus = async (c) => {
    const ns = c.status === "active" ? "paused" : "active";
    setCampaigns(l => l.map(x => x.id === c.id ? { ...x, status: ns } : x));
    await fetch(`${API_BASE}/api/campaigns/${c.id}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: ns }),
    });
  };

  const copyUrl = async (url) => { await navigator.clipboard.writeText(url); showToast("Tracking URL copied!"); };

  return (
    <CpaLayout>
      {toast && <div style={{ position: "fixed", top: 80, right: 24, zIndex: 9999, background: toast.type === "error" ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)", border: `1px solid ${toast.type === "error" ? "#fca5a5" : "#86efac"}`, color: toast.type === "error" ? "#dc2626" : "#16a34a", padding: "12px 20px", borderRadius: 12, fontSize: 13 }}>{toast.msg}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={pageTitle}>CPA Campaigns</h1>
          <p style={{ color: "#9b7faa", fontSize: 13 }}>{campaigns.length} campaigns · single tracking URL per campaign, pushed to advertiser</p>
        </div>
        <button style={btn} onClick={() => setShowForm(s => !s)}>{showForm ? "Cancel" : "+ New Campaign"}</button>
      </div>

      {showForm && (
        <div style={{ background: "#fff", border: "1px solid #e8d0dc", borderRadius: 16, padding: 20, marginBottom: 24, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          <select style={input} value={form.vertical_id} onChange={e => setForm(f => ({ ...f, vertical_id: e.target.value }))}>
            <option value="">Select Vertical</option>
            {verticals.map(v => <option key={v.id} value={v.id}>{v.icon} {v.name}</option>)}
          </select>
          <select style={input} value={form.advertiser_id} onChange={e => setForm(f => ({ ...f, advertiser_id: e.target.value }))}>
            <option value="">Select Advertiser</option>
            {advertisers.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input style={input} placeholder="Campaign name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input style={{ ...input, gridColumn: "span 3" }} placeholder="Destination URL — use {click_id} {aff_id} {sub1} {payout} {geo} macros" value={form.destination_url} onChange={e => setForm(f => ({ ...f, destination_url: e.target.value }))} />
          <input style={input} placeholder="Payout" type="number" value={form.payout} onChange={e => setForm(f => ({ ...f, payout: e.target.value }))} />
          <input style={input} placeholder="Geo (e.g. IQ)" value={form.geo} onChange={e => setForm(f => ({ ...f, geo: e.target.value }))} />
          <input style={input} placeholder="Daily cap (optional)" type="number" value={form.daily_cap} onChange={e => setForm(f => ({ ...f, daily_cap: e.target.value }))} />
          <button style={{ ...btn, gridColumn: "span 3", opacity: saving ? 0.7 : 1 }} onClick={createCampaign} disabled={saving}>{saving ? "Creating..." : "Create Campaign & Generate Tracking URL"}</button>
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid #e8d0dc", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Campaign</th>
                <th style={th}>Vertical</th>
                <th style={th}>Advertiser</th>
                <th style={th}>Tracking URL</th>
                <th style={th}>Payout</th>
                <th style={th}>Today (Clicks/Conv)</th>
                <th style={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <Fragment key={c.id}>
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
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <code style={{ fontSize: 11, background: "#f5eef8", padding: "3px 8px", borderRadius: 6, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.tracking_url}</code>
                      <button style={{ ...btn, padding: "4px 10px", fontSize: 11 }} onClick={() => copyUrl(c.tracking_url)}>Copy</button>
                    </div>
                  </td>
                  <td style={td}>{c.currency} {c.payout}</td>
                  <td style={td}>{c.today_clicks || 0} / {c.today_conversions || 0}</td>
                  <td style={td}>
                    <span style={badge(c.status === "active" ? "green" : "red")} onClick={() => toggleStatus(c)} title="Click to toggle">
                      {c.status === "active" ? "● Active" : "● Paused"}
                    </span>
                  </td>
                </tr>
                {expandedId === c.id && (
                  <tr>
                    <td style={{ ...td, background: "#fdf6f9" }} colSpan={7}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#9b7faa", textTransform: "uppercase", marginBottom: 6 }}>
                        Postback URL — share this with the advertiser so THEY notify us of conversions
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <code style={{ fontSize: 12, background: "#fff", padding: "6px 10px", borderRadius: 8, border: "1px solid #eedde8", flex: 1, overflowWrap: "break-word" }}>
                          {buildAdvertiserPostbackUrl()}
                        </code>
                        <button style={btn} onClick={() => copyUrl(buildAdvertiserPostbackUrl())}>Copy</button>
                      </div>
                      <div style={{ fontSize: 11, color: "#b89ab0" }}>
                        Macros: <b>{"{click_id}"}</b> — required, we passed this to advertiser in the tracking URL redirect ·{" "}
                        <b>{"{payout}"}</b> — optional, overrides campaign default payout ·{" "}
                        <b>{"{transaction_id}"}</b> — optional, advertiser's own reference ID ·{" "}
                        <b>status</b> — approved / pending / rejected
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
              {!campaigns.length && (
                <tr><td style={td} colSpan={7}>No campaigns yet — create one to get your first tracking URL.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </CpaLayout>
  );
}
