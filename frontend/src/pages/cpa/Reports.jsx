import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CpaLayout from "../../components/cpa/CpaLayout";
import { DatePickerField } from "../../components/DateRangePicker.jsx";
import { table, th, td, pageTitle, statRow, statCard, statLabel, statValue } from "../../styles/shared.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

const GREEN = "#16a34a";
const RED = "#dc2626";
const money = (n) => Number(n || 0).toFixed(2);

// Compact overrides so the whole filter row fits on one line instead of wrapping.
const compactSelect = { background: "#fff", border: "1px solid rgba(210,160,180,0.35)", color: "#4a2f3f", padding: "6px 8px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "'Inter',sans-serif", minWidth: 0 };
const compactInput = { ...compactSelect, cursor: "text" };
const compactBtn = { background: "linear-gradient(135deg,#e8856a,#d4709a)", color: "#fff", border: "none", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap" };

const GROUP_FIELD = {
  detailed: null,
  advertiser: "advertiser_name",
  publisher: "publisher_name",
  campaign: "campaign_name",
  geo: "geo",
  carrier: "carrier",
  date: "date",
  hour: "hour",
};
const GROUP_LABEL = { advertiser: "Advertiser", publisher: "Publisher", campaign: "Campaign", geo: "Geo", carrier: "Carrier", date: "Date", hour: "Hour" };

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
  const [searchParams] = useSearchParams();
  const token = localStorage.getItem("token");
  const verticalId = searchParams.get("vertical_id") || "";
  const [groupBy, setGroupBy] = useState("detailed");
  const [from, setFrom] = useState(daysAgo(7));
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
  const [hourFilter, setHourFilter] = useState("");
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(emptySums());
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [truncated, setTruncated] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [sort, setSort] = useState(null);

  useEffect(() => { if (!token) navigate("/login"); else { load(); loadAdvertisers(); loadPublishers(); loadGeoCarrierOptions(); } }, [searchParams.get("vertical_id")]);
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
  const loadGeoCarrierOptions = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/campaigns${verticalId ? `?vertical_id=${verticalId}` : ""}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        const geos = [...new Set(data.data.map(c => c.geo).filter(Boolean))].sort();
        const carriers = [...new Set(data.data.map(c => c.carrier).filter(Boolean))].sort();
        setGeoOptions(geos);
        setCarrierOptions(carriers);
        setCampaigns(data.data);
      }
    } catch { /* non-blocking */ }
  };

  const load = async (overrides = {}) => {
    const gGroupBy = overrides.groupBy ?? groupBy;
    const gAdvertiserId = overrides.advertiserId ?? advertiserId;
    const gAffiliateId = overrides.affiliateId ?? affiliateId;
    const gCampaignId = overrides.campaignId ?? campaignId;
    const gGeo = overrides.geo ?? geo;
    const gCarrier = overrides.carrier ?? carrier;
    const gHourFilter = overrides.hourFilter ?? hourFilter;
    const gFrom = overrides.from ?? from;
    const gTo = overrides.to ?? to;
    // Any load() call resets to page 1 unless a page number is explicitly passed —
    // only the Prev/Next/page-number controls pass page explicitly.
    const gPage = overrides.page ?? 1;

    if (gFrom && gTo && gFrom > gTo) return showToast("From date must be before To date");
    setRows([]);
    setSort(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({ group_by: gGroupBy, from: gFrom, to: gTo, page: gPage });
      if (verticalId) params.set("vertical_id", verticalId);
      if (gAdvertiserId) params.set("advertiser_id", gAdvertiserId);
      if (gAffiliateId) params.set("affiliate_id", gAffiliateId);
      if (gCampaignId) params.set("campaign_id", gCampaignId);
      if (gGeo.trim()) params.set("geo", gGeo.trim().toUpperCase());
      if (gCarrier.trim()) params.set("carrier", gCarrier.trim());
      if (gHourFilter !== "") params.set("hour", gHourFilter);
      const res = await fetch(`${API_BASE}/api/cpa-reports?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        setRows(data.data);
        setTotals({ ...emptySums(), ...data.totals });
        setTruncated(!!data.truncated);
        setPage(data.pagination?.page || gPage);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalRows(data.pagination?.totalRows || data.data.length);
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
  const hasTimeCol = groupBy === "date" || groupBy === "hour";
  const timeColLabel = groupBy === "hour" ? "Hour" : "Date";
  const baseColCount = 13; // Advertiser, Publisher, Campaign, Geo, Carrier + 8 metrics
  const colCount = hasTimeCol ? baseColCount + 1 : baseColCount;
  const labelColSpan = hasTimeCol ? 6 : 5; // Advertiser..Carrier (+Date/Hour when present)

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
      <p style={{ color: "#9b7faa", fontSize: 13, marginTop: -12, marginBottom: 4 }}>
        Advertiser, Publisher, Campaign, Geo and Carrier always show together · "Group by" adds a subtotal row per group ·
        Group by Hour works for any date range, not just today · Hour filter narrows to that hour-of-day (IST) across the whole range · click a column header to sort
      </p>
      {verticalId && <p style={{ color: "#9b7faa", fontSize: 12, marginBottom: 14 }}>Filtered to the vertical selected in the sidebar — click it again to clear.</p>}
      {truncated && <p style={{ color: "#9b7faa", fontSize: 12, marginBottom: 14 }}>Showing 1000 rows per page — use the page numbers below the table to see the rest. (Summary cards and GRAND TOTAL are always accurate across every page.)</p>}

      <div style={{ ...statRow, marginBottom: 18 }}>
        <div style={statCard}><div style={statLabel}>Clicks</div><div style={statValue}>{totals.clicks}</div></div>
        <div style={statCard}><div style={statLabel}>CR In</div><div style={statValue}>{totalCrIn}%</div></div>
        <div style={statCard}><div style={statLabel}>CR Out</div><div style={statValue}>{totalCrOut}%</div></div>
        <div style={statCard}><div style={statLabel}>Revenue</div><div style={{ ...statValue, color: GREEN }}>{money(totals.revenue)}</div></div>
        <div style={statCard}><div style={statLabel}>Publisher Cost</div><div style={{ ...statValue, color: RED }}>{money(totals.publisher_cost)}</div></div>
        <div style={statCard}><div style={statLabel}>Margin</div><div style={{ ...statValue, color: totals.margin >= 0 ? GREEN : RED }}>{money(totals.margin)}</div></div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "nowrap", overflowX: "auto", alignItems: "center", marginBottom: 18, paddingBottom: 4 }}>
        <select style={{ ...compactSelect, minWidth: 118 }} value={groupBy} onChange={e => { const v = e.target.value; setGroupBy(v); load({ groupBy: v }); }}>
          <option value="detailed">No grouping</option>
          <option value="advertiser">By Advertiser</option>
          <option value="publisher">By Publisher</option>
          <option value="campaign">By Campaign</option>
          <option value="geo">By Geo</option>
          <option value="carrier">By Carrier</option>
          <option value="date">By Date</option>
          <option value="hour">By Hour</option>
        </select>
        <select style={{ ...compactSelect, maxWidth: 130 }} value={advertiserId} onChange={e => { const v = e.target.value; setAdvertiserId(v); load({ advertiserId: v }); }}>
          <option value="">All Advertisers</option>
          {advertisers.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select style={{ ...compactSelect, maxWidth: 120 }} value={affiliateId} onChange={e => { const v = e.target.value; setAffiliateId(v); load({ affiliateId: v }); }}>
          <option value="">All Publishers</option>
          {publishers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select style={{ ...compactSelect, maxWidth: 130 }} value={campaignId} onChange={e => { const v = e.target.value; setCampaignId(v); load({ campaignId: v }); }}>
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
        <select style={{ ...compactSelect, width: 85 }} value={hourFilter} onChange={e => { const v = e.target.value; setHourFilter(v); load({ hourFilter: v }); }}>
          <option value="">Hour</option>
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
          ))}
        </select>
        <DatePickerField value={from} onChange={setFrom} style={{ ...compactInput, width: 110 }} />
        <DatePickerField value={to} onChange={setTo} style={{ ...compactInput, width: 110 }} />
        <button style={compactBtn} onClick={() => load()} disabled={loading}>{loading ? "..." : "Apply"}</button>
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
                {hasTimeCol && <SortTh label={timeColLabel} sortKey={groupBy} />}
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
                  {hasTimeCol && <td style={td}>{item.row.date || item.row.hour}</td>}
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
                <tr key={`s${i}`} style={{ background: "#fff4dc", borderLeft: "4px solid #e8a940" }}>
                  <td style={{ ...td, fontWeight: 800, color: "#8a5a00", background: "transparent" }} colSpan={labelColSpan}>
                    🔶 Subtotal — {GROUP_LABEL[groupBy]}: {item.key}
                  </td>
                  <td style={{ ...td, fontWeight: 800, background: "transparent" }}>{item.sums.clicks}</td>
                  <td style={{ ...td, fontWeight: 800, background: "transparent" }}>{item.sums.conversions_in}</td>
                  <td style={{ ...td, fontWeight: 800, background: "transparent" }}>{item.sums.clicks ? ((item.sums.conversions_in / item.sums.clicks) * 100).toFixed(2) : "0.00"}%</td>
                  <td style={{ ...td, fontWeight: 800, background: "transparent" }}>{item.sums.conversions_out}</td>
                  <td style={{ ...td, fontWeight: 800, background: "transparent" }}>{item.sums.clicks ? ((item.sums.conversions_out / item.sums.clicks) * 100).toFixed(2) : "0.00"}%</td>
                  <td style={{ ...td, color: GREEN, fontWeight: 800, background: "transparent" }}>{money(item.sums.revenue)}</td>
                  <td style={{ ...td, color: RED, fontWeight: 800, background: "transparent" }}>{money(item.sums.publisher_cost)}</td>
                  <td style={{ ...td, color: item.sums.margin >= 0 ? GREEN : RED, fontWeight: 800, background: "transparent" }}>{money(item.sums.margin)}</td>
                </tr>
              ))}
              {!flattened.length && (
                <tr><td style={td} colSpan={colCount}>{loading ? "Loading..." : "No data for this range."}</td></tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr style={{ background: "#fdf6f9", fontWeight: 800 }}>
                  <td style={td} colSpan={labelColSpan}>GRAND TOTAL</td>
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

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 12, color: "#9b7faa" }}>
            {totalRows.toLocaleString()} rows total · page {page} of {totalPages}
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button style={{ ...compactBtn, opacity: page <= 1 || loading ? 0.5 : 1 }} disabled={page <= 1 || loading} onClick={() => load({ page: page - 1 })}>← Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i - 1] > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) => p === "…" ? (
                <span key={`gap${i}`} style={{ fontSize: 12, color: "#b89ab0", padding: "0 4px" }}>…</span>
              ) : (
                <button
                  key={p}
                  style={{ ...compactBtn, background: p === page ? "linear-gradient(135deg,#e8856a,#d4709a)" : "#fff", color: p === page ? "#fff" : "#4a2f3f", minWidth: 32, opacity: loading ? 0.7 : 1 }}
                  disabled={loading}
                  onClick={() => load({ page: p })}
                >
                  {p}
                </button>
              ))}
            <button style={{ ...compactBtn, opacity: page >= totalPages || loading ? 0.5 : 1 }} disabled={page >= totalPages || loading} onClick={() => load({ page: page + 1 })}>Next →</button>
          </div>
        </div>
      )}
    </CpaLayout>
  );
}
