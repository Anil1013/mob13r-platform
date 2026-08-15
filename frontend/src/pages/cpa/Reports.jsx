import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import CpaLayout from "../../components/cpa/CpaLayout";
import { table, th, td, pageTitle, filterBar, filterInput, filterSelect, applyBtn, statRow, statCard, statLabel, statValue } from "../../styles/shared.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

const GREEN = "#16a34a";
const RED = "#dc2626";
const money = (n) => Number(n || 0).toFixed(2);

const GROUP_FIELD = {
  detailed: null,
  advertiser: "advertiser_name",
  publisher: "publisher_name",
  campaign: "campaign_name",
  geo: "geo",
  carrier: "carrier",
};
const GROUP_LABEL = { advertiser: "Advertiser", publisher: "Publisher", campaign: "Campaign", geo: "Geo", carrier: "Carrier" };

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

export default function CpaReports() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [groupBy, setGroupBy] = useState("detailed");
  const [from, setFrom] = useState(daysAgo(7));
  const [to, setTo] = useState(today());
  const [advertisers, setAdvertisers] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [advertiserId, setAdvertiserId] = useState("");
  const [affiliateId, setAffiliateId] = useState("");
  const [geo, setGeo] = useState("");
  const [carrier, setCarrier] = useState("");
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(emptySums());
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [sort, setSort] = useState(null);

  useEffect(() => { if (!token) navigate("/login"); else { load(); loadAdvertisers(); loadPublishers(); } }, []);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  const loadAdvertisers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/advertisers`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setAdvertisers(data);
    } catch { /* non-blocking */ }
  };
  const loadPublishers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/affiliates`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === "SUCCESS") setPublishers(data.data);
    } catch { /* non-blocking */ }
  };

  const load = async (overrides = {}) => {
    const gGroupBy = overrides.groupBy ?? groupBy;
    const gAdvertiserId = overrides.advertiserId ?? advertiserId;
    const gAffiliateId = overrides.affiliateId ?? affiliateId;
    const gGeo = overrides.geo ?? geo;
    const gCarrier = overrides.carrier ?? carrier;
    const gFrom = overrides.from ?? from;
    const gTo = overrides.to ?? to;

    if (gFrom && gTo && gFrom > gTo) return showToast("From date must be before To date");
    setRows([]);
    setSort(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({ group_by: gGroupBy, from: gFrom, to: gTo });
      if (gAdvertiserId) params.set("advertiser_id", gAdvertiserId);
      if (gAffiliateId) params.set("affiliate_id", gAffiliateId);
      if (gGeo.trim()) params.set("geo", gGeo.trim().toUpperCase());
      if (gCarrier.trim()) params.set("carrier", gCarrier.trim());
      const res = await fetch(`${API_BASE}/api/cpa-reports?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        setRows(data.data);
        setTotals({ ...emptySums(), ...data.totals });
      } else showToast(data.message || "Failed to load report");
    } catch {
      showToast("Network error while loading report");
    } finally {
      setLoading(false);
    }
  };

  const totalCrIn = totals.clicks ? ((totals.conversions_in / totals.clicks) * 100).toFixed(2) : "0.00";
  const totalCrOut = totals.clicks ? ((totals.conversions_out / totals.clicks) * 100).toFixed(2) : "0.00";

  const toggleSort = (key) => setSort(s => ({ key, dir: s && s.key === key && s.dir === "desc" ? "asc" : "desc" }));

  const displayRows = useMemo(() => {
    if (!sort) return rows;
    const arr = [...rows];
    arr.sort((a, b) => {
      let av = a[sort.key], bv = b[sort.key];
      if (typeof av === "string") { av = av.toLowerCase(); bv = (bv || "").toLowerCase(); }
      else { av = Number(av) || 0; bv = Number(bv) || 0; }
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [rows, sort]);

  const groupField = GROUP_FIELD[groupBy];

  const flattened = useMemo(() => {
    if (!groupField) return displayRows.map(row => ({ type: "row", row }));
    const groups = new Map();
    for (const r of displayRows) {
      const key = r[groupField] ?? "—";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }
    const out = [];
    for (const [key, groupRows] of groups) {
      for (const r of groupRows) out.push({ type: "row", row: r });
      out.push({ type: "subtotal", key, sums: groupRows.reduce(addSums, emptySums()) });
    }
    return out;
  }, [displayRows, groupField]);

  const SortTh = ({ label, sortKey }) => (
    <th style={{ ...th, cursor: "pointer", userSelect: "none" }} onClick={() => toggleSort(sortKey)}>
      {label} {sort?.key === sortKey ? (sort.dir === "desc" ? "▼" : "▲") : ""}
    </th>
  );

  return (
    <CpaLayout>
      {toast && <div style={{ position: "fixed", top: 80, right: 24, zIndex: 9999, background: "rgba(239,68,68,0.08)", border: "1px solid #fca5a5", color: "#dc2626", padding: "12px 20px", borderRadius: 12, fontSize: 13 }}>{toast}</div>}
      <h1 style={pageTitle}>Reports</h1>
      <p style={{ color: "#9b7faa", fontSize: 13, marginTop: -12, marginBottom: 18 }}>
        Advertiser, Publisher, Campaign, Geo and Carrier always show together · "Group by" adds a subtotal row per group · click a column header to sort
      </p>

      <div style={{ ...statRow, marginBottom: 18 }}>
        <div style={statCard}><div style={statLabel}>Clicks</div><div style={statValue}>{totals.clicks}</div></div>
        <div style={statCard}><div style={statLabel}>CR In</div><div style={statValue}>{totalCrIn}%</div></div>
        <div style={statCard}><div style={statLabel}>CR Out</div><div style={statValue}>{totalCrOut}%</div></div>
        <div style={statCard}><div style={statLabel}>Revenue</div><div style={{ ...statValue, color: GREEN }}>{money(totals.revenue)}</div></div>
        <div style={statCard}><div style={statLabel}>Publisher Cost</div><div style={{ ...statValue, color: RED }}>{money(totals.publisher_cost)}</div></div>
        <div style={statCard}><div style={statLabel}>Margin</div><div style={{ ...statValue, color: totals.margin >= 0 ? GREEN : RED }}>{money(totals.margin)}</div></div>
      </div>

      <div style={{ ...filterBar, flexWrap: "wrap" }}>
        <select style={filterSelect} value={groupBy} onChange={e => { const v = e.target.value; setGroupBy(v); load({ groupBy: v }); }}>
          <option value="detailed">No grouping (all rows)</option>
          <option value="advertiser">Group by Advertiser</option>
          <option value="publisher">Group by Publisher</option>
          <option value="campaign">Group by Campaign</option>
          <option value="geo">Group by Geo</option>
          <option value="carrier">Group by Carrier</option>
        </select>
        <select style={filterSelect} value={advertiserId} onChange={e => { const v = e.target.value; setAdvertiserId(v); load({ advertiserId: v }); }}>
          <option value="">All Advertisers</option>
          {advertisers.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select style={filterSelect} value={affiliateId} onChange={e => { const v = e.target.value; setAffiliateId(v); load({ affiliateId: v }); }}>
          <option value="">All Publishers</option>
          {publishers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input style={{ ...filterInput, width: 90 }} placeholder="Geo" value={geo} onChange={e => setGeo(e.target.value)} />
        <input style={{ ...filterInput, width: 110 }} placeholder="Carrier" value={carrier} onChange={e => setCarrier(e.target.value)} />
        <input style={filterInput} type="date" value={from} onChange={e => setFrom(e.target.value)} />
        <input style={filterInput} type="date" value={to} onChange={e => setTo(e.target.value)} />
        <button style={applyBtn} onClick={() => load()} disabled={loading}>{loading ? "Loading..." : "Apply"}</button>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e8d0dc", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto", maxHeight: "65vh", overflowY: "auto" }}>
          <table style={table}>
            <thead>
              <tr>
                <SortTh label="Advertiser" sortKey="advertiser_name" />
                <SortTh label="Publisher" sortKey="publisher_name" />
                <SortTh label="Campaign" sortKey="campaign_name" />
                <SortTh label="Geo" sortKey="geo" />
                <SortTh label="Carrier" sortKey="carrier" />
                <SortTh label="Clicks" sortKey="clicks" />
                <SortTh label="Conv. In" sortKey="conversions_in" />
                <SortTh label="CR In" sortKey="cr_in" />
                <SortTh label="Conv. Out" sortKey="conversions_out" />
                <SortTh label="CR Out" sortKey="cr_out" />
                <SortTh label="Revenue" sortKey="revenue" />
                <SortTh label="Publisher Cost" sortKey="publisher_cost" />
                <SortTh label="Margin" sortKey="margin" />
              </tr>
            </thead>
            <tbody>
              {flattened.map((item, i) => item.type === "row" ? (
                <tr key={`r${i}`}>
                  <td style={td}>{item.row.advertiser_name}</td>
                  <td style={td}>{item.row.publisher_name}</td>
                  <td style={td}>{item.row.campaign_name}</td>
                  <td style={td}>{item.row.geo}</td>
                  <td style={td}>{item.row.carrier}</td>
                  <td style={td}>{item.row.clicks}</td>
                  <td style={td}>{item.row.conversions_in}</td>
                  <td style={td}>{item.row.cr_in}%</td>
                  <td style={td}>{item.row.conversions_out}</td>
                  <td style={td}>{item.row.cr_out}%</td>
                  <td style={{ ...td, color: GREEN, fontWeight: 600 }}>{money(item.row.revenue)}</td>
                  <td style={{ ...td, color: RED, fontWeight: 600 }}>{money(item.row.publisher_cost)}</td>
                  <td style={{ ...td, color: item.row.margin >= 0 ? GREEN : RED, fontWeight: 700 }}>{money(item.row.margin)}</td>
                </tr>
              ) : (
                <tr key={`s${i}`} style={{ background: "#f5eef8" }}>
                  <td style={{ ...td, fontWeight: 800 }} colSpan={5}>
                    Subtotal — {GROUP_LABEL[groupBy]}: {item.key}
                  </td>
                  <td style={{ ...td, fontWeight: 800 }}>{item.sums.clicks}</td>
                  <td style={{ ...td, fontWeight: 800 }}>{item.sums.conversions_in}</td>
                  <td style={{ ...td, fontWeight: 800 }}>{item.sums.clicks ? ((item.sums.conversions_in / item.sums.clicks) * 100).toFixed(2) : "0.00"}%</td>
                  <td style={{ ...td, fontWeight: 800 }}>{item.sums.conversions_out}</td>
                  <td style={{ ...td, fontWeight: 800 }}>{item.sums.clicks ? ((item.sums.conversions_out / item.sums.clicks) * 100).toFixed(2) : "0.00"}%</td>
                  <td style={{ ...td, color: GREEN, fontWeight: 800 }}>{money(item.sums.revenue)}</td>
                  <td style={{ ...td, color: RED, fontWeight: 800 }}>{money(item.sums.publisher_cost)}</td>
                  <td style={{ ...td, color: item.sums.margin >= 0 ? GREEN : RED, fontWeight: 800 }}>{money(item.sums.margin)}</td>
                </tr>
              ))}
              {!flattened.length && (
                <tr><td style={td} colSpan={13}>{loading ? "Loading..." : "No data for this range."}</td></tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr style={{ background: "#fdf6f9", fontWeight: 800 }}>
                  <td style={td} colSpan={5}>GRAND TOTAL</td>
                  <td style={td}>{totals.clicks}</td>
                  <td style={td}>{totals.conversions_in}</td>
                  <td style={td}>{totalCrIn}%</td>
                  <td style={td}>{totals.conversions_out}</td>
                  <td style={td}>{totalCrOut}%</td>
                  <td style={{ ...td, color: GREEN }}>{money(totals.revenue)}</td>
                  <td style={{ ...td, color: RED }}>{money(totals.publisher_cost)}</td>
                  <td style={{ ...td, color: totals.margin >= 0 ? GREEN : RED }}>{money(totals.margin)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </CpaLayout>
  );
}
