import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CpaLayout from "../../components/cpa/CpaLayout";
import { table, th, td, badge, pageTitle, statRow, statCard, statLabel, statValue } from "../../styles/shared.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

const compactSelect = { background: "#fff", border: "1px solid rgba(210,160,180,0.35)", color: "#4a2f3f", padding: "6px 8px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "'Lora',serif", minWidth: 0 };
const compactInput = { ...compactSelect, cursor: "text" };
const compactBtn = { background: "linear-gradient(135deg,#e8856a,#d4709a)", color: "#fff", border: "none", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Lora',serif", whiteSpace: "nowrap" };

export default function Conversions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = localStorage.getItem("token");
  const verticalId = searchParams.get("vertical_id") || "";
  const [conversions, setConversions] = useState([]);
  const [summary, setSummary] = useState({ total_conversions: 0, total_payout: 0, today_conversions: 0 });
  const [advertisers, setAdvertisers] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [advertiserId, setAdvertiserId] = useState("");
  const [affiliateId, setAffiliateId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [from, setFrom] = useState(daysAgo(7));
  const [to, setTo] = useState(today());
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { if (!token) navigate("/login"); else { load(); loadFilterOptions(); } }, [searchParams.get("vertical_id")]);
  const showToast = (msg, type = "error") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2800); };

  const loadFilterOptions = async () => {
    try {
      const campParams = verticalId ? `?vertical_id=${verticalId}` : "";
      const [advRes, pubRes, campRes] = await Promise.all([
        fetch(`${API_BASE}/api/advertisers`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/affiliates`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/campaigns${campParams}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const advData = await advRes.json();
      const pubData = await pubRes.json();
      const campData = await campRes.json();
      if (Array.isArray(advData)) setAdvertisers(advData);
      if (pubData.status === "SUCCESS") setPublishers(pubData.data);
      if (campData.status === "SUCCESS") setCampaigns(campData.data);
    } catch { /* non-blocking */ }
  };

  const load = async (overrides = {}) => {
    const gAdvertiserId = overrides.advertiserId ?? advertiserId;
    const gAffiliateId = overrides.affiliateId ?? affiliateId;
    const gCampaignId = overrides.campaignId ?? campaignId;
    const gFrom = overrides.from ?? from;
    const gTo = overrides.to ?? to;

    if (gFrom && gTo && gFrom > gTo) return showToast("From date must be before To date");
    setLoading(true);
    try {
      const params = new URLSearchParams({ from: gFrom, to: gTo });
      if (verticalId) params.set("vertical_id", verticalId);
      if (gAdvertiserId) params.set("advertiser_id", gAdvertiserId);
      if (gAffiliateId) params.set("affiliate_id", gAffiliateId);
      if (gCampaignId) params.set("campaign_id", gCampaignId);
      const [cRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/api/conversions?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/conversions/summary`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const cData = await cRes.json();
      const sData = await sRes.json();
      if (cData.status === "SUCCESS") setConversions(cData.data);
      else showToast(cData.message || "Failed to load conversions");
      if (sData.status === "SUCCESS") setSummary(sData.data);
    } catch {
      showToast("Network error while loading conversions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <CpaLayout>
      {toast && <div style={{ position: "fixed", top: 80, right: 24, zIndex: 9999, background: "rgba(239,68,68,0.08)", border: "1px solid #fca5a5", color: "#dc2626", padding: "12px 20px", borderRadius: 12, fontSize: 13 }}>{toast.msg}</div>}
      <h1 style={pageTitle}>Conversions</h1>
      {verticalId && <p style={{ color: "#9b7faa", fontSize: 12, marginTop: -8, marginBottom: 14 }}>Filtered to the vertical selected in the sidebar — click it again to clear.</p>}

      <div style={{ ...statRow, marginBottom: 18 }}>
        <div style={statCard}><div style={statLabel}>Total Conversions</div><div style={statValue}>{summary.total_conversions}</div></div>
        <div style={statCard}><div style={statLabel}>Total Payout</div><div style={statValue}>{summary.total_payout}</div></div>
        <div style={statCard}><div style={statLabel}>Today</div><div style={statValue}>{summary.today_conversions}</div></div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "nowrap", overflowX: "auto", alignItems: "center", marginBottom: 18, paddingBottom: 4 }}>
        <select style={{ ...compactSelect, maxWidth: 150 }} value={advertiserId} onChange={e => { const v = e.target.value; setAdvertiserId(v); load({ advertiserId: v }); }}>
          <option value="">All Advertisers</option>
          {advertisers.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select style={{ ...compactSelect, maxWidth: 130 }} value={affiliateId} onChange={e => { const v = e.target.value; setAffiliateId(v); load({ affiliateId: v }); }}>
          <option value="">All Publishers</option>
          {publishers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select style={{ ...compactSelect, maxWidth: 150 }} value={campaignId} onChange={e => { const v = e.target.value; setCampaignId(v); load({ campaignId: v }); }}>
          <option value="">All Campaigns</option>
          {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input style={{ ...compactInput, width: 128 }} type="date" value={from} onChange={e => setFrom(e.target.value)} />
        <input style={{ ...compactInput, width: 128 }} type="date" value={to} onChange={e => setTo(e.target.value)} />
        <button style={compactBtn} onClick={() => load()} disabled={loading}>{loading ? "..." : "Apply"}</button>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e8d0dc", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto", maxHeight: "65vh", overflowY: "auto" }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Click ID</th>
                <th style={th}>Advertiser</th>
                <th style={th}>Publisher</th>
                <th style={th}>Campaign</th>
                <th style={th}>Payout</th>
                <th style={th}>Transaction ID</th>
                <th style={th}>Forwarded</th>
                <th style={th}>Status</th>
                <th style={th}>Time</th>
              </tr>
            </thead>
            <tbody>
              {conversions.map(c => (
                <tr key={c.id}>
                  <td style={td}><code style={{ fontSize: 11 }}>{c.click_id}</code></td>
                  <td style={td}>{c.advertiser_name}</td>
                  <td style={td}>{c.affiliate_name || "—"}</td>
                  <td style={td}>{c.campaign_name}</td>
                  <td style={td}>{c.payout}</td>
                  <td style={td}>{c.transaction_id || "—"}</td>
                  <td style={td}>{c.postback_forwarded ? "✅" : "—"}</td>
                  <td style={td}><span style={badge(c.status === "approved" ? "green" : "red")}>{c.status}</span></td>
                  <td style={td}>{new Date(c.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {!conversions.length && (
                <tr><td style={td} colSpan={9}>{loading ? "Loading..." : "No conversions for this filter."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </CpaLayout>
  );
}
