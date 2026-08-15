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

const MODE_LABEL = {
  advertiser_publisher: null, // has its own multi-column header, handled separately
  advertiser: "Advertiser",
  publisher: "Publisher",
  campaign: "Campaign",
  geo: "Geo",
  carrier: "Carrier",
  vertical: "Vertical",
  date: "Date",
};

export default function CpaReports() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [groupBy, setGroupBy] = useState("advertiser_publisher");
  const [from, setFrom] = useState(daysAgo(7));
  const [to, setTo] = useState(today());
  const [advertisers, setAdvertisers] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [advertiserId, setAdvertiserId] = useState("");
  const [affiliateId, setAffiliateId] = useState("");
  const [geo, setGeo] = useState("");
  const [carrier, setCarrier] = useState("");
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ clicks: 0, conversions_in: 0, conversions_out: 0, revenue: 0, publisher_cost: 0, margin: 0 });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [sort, setSort] = useState({ key: "clicks", dir: "desc" });

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

  const load = async () => {
    if (from && to && from > to) return showToast("From date must be before To date");
    setLoading(true);
    try {
      const params = new URLSearchParams({ group_by: groupBy, from, to });
      if (advertiserId) params.set("advertiser_id", advertiserId);
      if (affiliateId) params.set("affiliate_id", affiliateId);
      if (geo.trim()) params.set("geo", geo.trim().toUpperCase());
      if (carrier.trim()) params.set("carrier", carrier.trim());
      const res = await fetch(`${API_BASE}/api/cpa-reports?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        setRows(data.data);
        setTotals({ clicks: 0, conversions_in: 0, conversions_out: 0, revenue: 0, publisher_cost: 0, margin: 0, ...data.totals });
      } else showToast(data.message || "Failed to load report");
    } catch {
      showToast("Network error while loading report");
    } finally {
      setLoading(false);
    }
  };

  const isAdvPub = groupBy === "advertiser_publisher";
  const isCampaign = groupBy === "campaign";
  const groupLabel = MODE_LABEL[groupBy] || "Group";
  const totalCrIn = totals.clicks ? ((totals.conversions_in / totals.clicks) * 100).toFixed(2) : "0.00";
  const totalCrOut = totals.clicks ? ((totals.conversions_out / totals.clicks) * 100).toFixed(2) : "0.00";

  const toggleSort = (key) => setSort(s => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));

  const sortedRows = useMemo(() => {
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

  const SortTh = ({ label, sortKey }) => (
    <th style={{ ...th, cursor: "pointer", userSelect: "none" }} onClick={() => toggleSort(sortKey)}>
      {label} {sort.key === sortKey ? (sort.dir === "desc" ? "▼" : "▲") : ""}
    </th>
  );

  const colCount = isAdvPub ? 12 : (isCampaign ? 9 : 8);

  return (
    <CpaLayout>
      {toast && <div style={{ position: "fixed", top: 80, right: 24, zIndex: 9999, background: "rgba(239,68,68,0.08)", border: "1px solid #fca5a5", color: "#dc2626", padding: "12px 20px", borderRadius: 12, fontSize: 13 }}>{toast}</div>}
      <h1 style={pageTitle}>Reports</h1>
      <p style={{ color: "#9b7faa", fontSize: 13, marginTop: -12, marginBottom: 18 }}>
        CR In = conversions the advertiser confirmed · CR Out = conversions actually forwarded to the publisher (after any hold %) · click a column header to sort
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
        <select style={filterSelect} value={groupBy} onChange={e => setGroupBy(e.target.value)}>
          <option value="advertiser_publisher">Detailed (Advertiser × Publisher × Campaign)</option>
          <option value="advertiser">Group by Advertiser</option>
          <option value="publisher">Group by Publisher</option>
          <option value="campaign">Group by Campaign</option>
          <option value="geo">Group by Geo</option>
          <option value="carrier">Group by Carrier</option>
          <option value="vertical">Group by Vertical</option>
          <option value="date">Group by Date</option>
        </select>
        <select style={filterSelect} value={advertiserId} onChange={e => setAdvertiserId(e.target.value)}>
          <option value="">All Advertisers</option>
          {advertisers.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select style={filterSelect} value={affiliateId} onChange={e => setAffiliateId(e.target.value)}>
          <option value="">All Publishers</option>
          {publishers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input style={{ ...filterInput, width: 90 }} placeholder="Geo" value={geo} onChange={e => setGeo(e.target.value)} />
        <input style={{ ...filterInput, width: 110 }} placeholder="Carrier" value={carrier} onChange={e => setCarrier(e.target.value)} />
        <input style={filterInput} type="date" value={from} onChange={e => setFrom(e.target.value)} />
        <input style={filterInput} type="date" value={to} onChange={e => setTo(e.target.value)} />
        <button style={applyBtn} onClick={load} disabled={loading}>{loading ? "Loading..." : "Apply"}</button>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e8d0dc", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto", maxHeight: "65vh", overflowY: "auto" }}>
          <table style={table}>
            <thead>
              <tr>
                {isAdvPub ? (
                  <>
                    <SortTh label="Advertiser" sortKey="advertiser_name" />
                    <SortTh label="Publisher" sortKey="publisher_name" />
                    <SortTh label="Campaign" sortKey="campaign_name" />
                    <SortTh label="Geo" sortKey="geo" />
                    <SortTh label="Carrier" sortKey="carrier" />
                  </>
                ) : (
                  <>
                    <SortTh label={groupLabel} sortKey="label" />
                    {isCampaign && <SortTh label="Advertiser" sortKey="advertiser_name" />}
                  </>
                )}
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
              {sortedRows.map((r, i) => (
                <tr key={i}>
                  {isAdvPub ? (
                    <>
                      <td style={td}>{r.advertiser_name}</td>
                      <td style={td}>{r.publisher_name}</td>
                      <td style={td}>{r.campaign_name}</td>
                      <td style={td}>{r.geo}</td>
                      <td style={td}>{r.carrier}</td>
                    </>
                  ) : (
                    <>
                      <td style={td}>{groupBy === "date" ? new Date(r.label).toLocaleDateString() : r.label}</td>
                      {isCampaign && <td style={td}>{r.advertiser_name || "—"}</td>}
                    </>
                  )}
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
              {!sortedRows.length && (
                <tr><td style={td} colSpan={colCount}>{loading ? "Loading..." : "No data for this range."}</td></tr>
              )}
            </tbody>
            {sortedRows.length > 0 && (
              <tfoot>
                <tr style={{ background: "#fdf6f9", fontWeight: 800 }}>
                  {isAdvPub ? (
                    <>
                      <td style={td}>TOTAL</td>
                      <td style={td}>{sortedRows.length} rows</td>
                      <td style={td}>—</td>
                      <td style={td}>—</td>
                      <td style={td}>—</td>
                    </>
                  ) : (
                    <>
                      <td style={td}>TOTAL</td>
                      {isCampaign && <td style={td}>—</td>}
                    </>
                  )}
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
