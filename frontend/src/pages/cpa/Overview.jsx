import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import CpaLayout from "../../components/cpa/CpaLayout";
import { table, th, td, pageTitle, statRow, statCard, statLabel, statValue } from "../../styles/shared.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

const GREEN = "#16a34a";
const RED = "#dc2626";
const money = (n) => Number(n || 0).toFixed(2);

const compactSelect = { background: "#fff", border: "1px solid rgba(210,160,180,0.35)", color: "#4a2f3f", padding: "6px 8px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "'Lora',serif", minWidth: 0 };
const compactInput = { ...compactSelect, cursor: "text" };
const compactBtn = { background: "linear-gradient(135deg,#e8856a,#d4709a)", color: "#fff", border: "none", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Lora',serif", whiteSpace: "nowrap" };
const toggleBtn = (active) => ({
  padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "1px solid rgba(210,160,180,0.35)",
  background: active ? "linear-gradient(135deg,#e8856a,#d4709a)" : "#fff", color: active ? "#fff" : "#4a2f3f", fontFamily: "'Lora',serif",
});

function emptySums() {
  return { clicks: 0, conversions_in: 0, conversions_out: 0, revenue: 0, publisher_cost: 0, margin: 0 };
}
function addSums(a, r) {
  return {
    clicks: a.clicks + r.clicks,
    conversions_in: a.conversions_in + r.conversions_in,
    conversions_out: a.conversions_out + r.conversions_out,
    revenue: a.revenue + r.revenue,
    publisher_cost: a.publisher_cost + r.publisher_cost,
    margin: a.margin + r.margin,
  };
}
function withRates(sums) {
  return {
    ...sums,
    cr_in: sums.clicks ? ((sums.conversions_in / sums.clicks) * 100).toFixed(2) : "0.00",
    cr_out: sums.clicks ? ((sums.conversions_out / sums.clicks) * 100).toFixed(2) : "0.00",
  };
}

export default function CpaOverview() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [mode, setMode] = useState("vertical"); // "vertical" | "date"
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(today());
  const [advertisers, setAdvertisers] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [geoOptions, setGeoOptions] = useState([]);
  const [carrierOptions, setCarrierOptions] = useState([]);
  const [advertiserId, setAdvertiserId] = useState("");
  const [affiliateId, setAffiliateId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [geo, setGeo] = useState("");
  const [carrier, setCarrier] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { if (!token) navigate("/login"); else { load(); loadFilterOptions(); } }, []);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  const loadFilterOptions = async () => {
    try {
      const [advRes, pubRes, campRes] = await Promise.all([
        fetch(`${API_BASE}/api/advertisers`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/affiliates`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/campaigns`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const advData = await advRes.json();
      const pubData = await pubRes.json();
      const campData = await campRes.json();
      if (Array.isArray(advData)) setAdvertisers(advData);
      if (pubData.status === "SUCCESS") setPublishers(pubData.data);
      if (campData.status === "SUCCESS") {
        setCampaigns(campData.data);
        setGeoOptions([...new Set(campData.data.map(c => c.geo).filter(Boolean))].sort());
        setCarrierOptions([...new Set(campData.data.map(c => c.carrier).filter(Boolean))].sort());
      }
    } catch { /* non-blocking */ }
  };

  const load = async (overrides = {}) => {
    const gMode = overrides.mode ?? mode;
    const gAdvertiserId = overrides.advertiserId ?? advertiserId;
    const gAffiliateId = overrides.affiliateId ?? affiliateId;
    const gCampaignId = overrides.campaignId ?? campaignId;
    const gGeo = overrides.geo ?? geo;
    const gCarrier = overrides.carrier ?? carrier;
    const gFrom = overrides.from ?? from;
    const gTo = overrides.to ?? to;

    if (gFrom && gTo && gFrom > gTo) return showToast("From date must be before To date");
    setLoading(true);
    try {
      const params = new URLSearchParams({ group_by: gMode === "date" ? "date" : "vertical", from: gFrom, to: gTo });
      if (gAdvertiserId) params.set("advertiser_id", gAdvertiserId);
      if (gAffiliateId) params.set("affiliate_id", gAffiliateId);
      if (gCampaignId) params.set("campaign_id", gCampaignId);
      if (gGeo.trim()) params.set("geo", gGeo.trim().toUpperCase());
      if (gCarrier.trim()) params.set("carrier", gCarrier.trim());
      const res = await fetch(`${API_BASE}/api/cpa-reports?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === "SUCCESS") setRows(data.data);
      else showToast(data.message || "Failed to load overview");
    } catch {
      showToast("Network error while loading overview");
    } finally {
      setLoading(false);
    }
  };

  // Rows come back at full (advertiser/publisher/campaign) grain — aggregate
  // client-side into one row per vertical, or one row per date.
  const aggregated = useMemo(() => {
    const key = mode === "date" ? "date" : "vertical_name";
    const groups = new Map();
    for (const r of rows) {
      const k = r[key] ?? "—";
      if (!groups.has(k)) groups.set(k, emptySums());
      groups.set(k, addSums(groups.get(k), r));
    }
    let entries = [...groups.entries()].map(([k, sums]) => ({ key: k, ...withRates(sums) }));
    entries.sort((a, b) => mode === "date" ? (a.key < b.key ? 1 : -1) : b.revenue - a.revenue);
    return entries;
  }, [rows, mode]);

  const grandTotal = useMemo(() => withRates(rows.reduce(addSums, emptySums())), [rows]);

  return (
    <CpaLayout>
      {toast && <div style={{ position: "fixed", top: 80, right: 24, zIndex: 9999, background: "rgba(239,68,68,0.08)", border: "1px solid #fca5a5", color: "#dc2626", padding: "12px 20px", borderRadius: 12, fontSize: 13 }}>{toast}</div>}
      <h1 style={pageTitle}>Overview — All Verticals Revenue</h1>
      <p style={{ color: "#9b7faa", fontSize: 13, marginTop: -12, marginBottom: 18 }}>
        Combined revenue across CPA, CPI, CPS, DCB and any other vertical you've added · filters narrow both views the same way
      </p>

      <div style={{ ...statRow, marginBottom: 18 }}>
        <div style={statCard}><div style={statLabel}>Clicks</div><div style={statValue}>{grandTotal.clicks}</div></div>
        <div style={statCard}><div style={statLabel}>CR In</div><div style={statValue}>{grandTotal.cr_in}%</div></div>
        <div style={statCard}><div style={statLabel}>CR Out</div><div style={statValue}>{grandTotal.cr_out}%</div></div>
        <div style={statCard}><div style={statLabel}>Revenue</div><div style={{ ...statValue, color: GREEN }}>{money(grandTotal.revenue)}</div></div>
        <div style={statCard}><div style={statLabel}>Publisher Cost</div><div style={{ ...statValue, color: RED }}>{money(grandTotal.publisher_cost)}</div></div>
        <div style={statCard}><div style={statLabel}>Margin</div><div style={{ ...statValue, color: grandTotal.margin >= 0 ? GREEN : RED }}>{money(grandTotal.margin)}</div></div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "nowrap", overflowX: "auto", alignItems: "center", marginBottom: 18, paddingBottom: 4 }}>
        <button style={toggleBtn(mode === "vertical")} onClick={() => { setMode("vertical"); load({ mode: "vertical" }); }}>By Vertical</button>
        <button style={toggleBtn(mode === "date")} onClick={() => { setMode("date"); load({ mode: "date" }); }}>By Date</button>
        <span style={{ width: 1, height: 24, background: "#e8d0dc", margin: "0 4px" }} />
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
        <select style={{ ...compactSelect, width: 70 }} value={geo} onChange={e => { const v = e.target.value; setGeo(v); load({ geo: v }); }}>
          <option value="">Geo</option>
          {geoOptions.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select style={{ ...compactSelect, width: 90 }} value={carrier} onChange={e => { const v = e.target.value; setCarrier(v); load({ carrier: v }); }}>
          <option value="">Carrier</option>
          {carrierOptions.map(c => <option key={c} value={c}>{c}</option>)}
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
                <th style={th}>{mode === "date" ? "Date" : "Vertical"}</th>
                <th style={th}>Clicks</th>
                <th style={th}>Conv. In</th>
                <th style={th}>CR In</th>
                <th style={th}>Conv. Out</th>
                <th style={th}>CR Out</th>
                <th style={th}>Revenue</th>
                <th style={th}>Publisher Cost</th>
                <th style={th}>Margin</th>
              </tr>
            </thead>
            <tbody>
              {aggregated.map((r, i) => (
                <tr key={i}>
                  <td style={td}>{mode === "date" ? new Date(r.key).toLocaleDateString() : r.key}</td>
                  <td style={td}>{r.clicks}</td>
                  <td style={td}>{r.conversions_in}</td>
                  <td style={td}>{r.cr_in}%</td>
                  <td style={td}>{r.conversions_out}</td>
                  <td style={td}>{r.cr_out}%</td>
                  <td style={{ ...td, color: GREEN, fontWeight: 600 }}>{money(r.revenue)}</td>
                  <td style={{ ...td, color: RED, fontWeight: 600 }}>{money(r.publisher_cost)}</td>
                  <td style={{ ...td, color: r.margin >= 0 ? GREEN : RED, fontWeight: 700 }}>{money(r.margin)}</td>
                </tr>
              ))}
              {!aggregated.length && (
                <tr><td style={td} colSpan={9}>{loading ? "Loading..." : "No data for this range."}</td></tr>
              )}
            </tbody>
            {aggregated.length > 0 && (
              <tfoot>
                <tr style={{ background: "#fdf6f9", fontWeight: 800 }}>
                  <td style={td}>GRAND TOTAL</td>
                  <td style={td}>{grandTotal.clicks}</td>
                  <td style={td}>{grandTotal.conversions_in}</td>
                  <td style={td}>{grandTotal.cr_in}%</td>
                  <td style={td}>{grandTotal.conversions_out}</td>
                  <td style={td}>{grandTotal.cr_out}%</td>
                  <td style={{ ...td, color: GREEN }}>{money(grandTotal.revenue)}</td>
                  <td style={{ ...td, color: RED }}>{money(grandTotal.publisher_cost)}</td>
                  <td style={{ ...td, color: grandTotal.margin >= 0 ? GREEN : RED }}>{money(grandTotal.margin)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </CpaLayout>
  );
}
