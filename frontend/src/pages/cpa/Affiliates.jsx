import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CpaLayout from "../../components/cpa/CpaLayout";
import { btn, input, badge, pageTitle } from "../../styles/shared.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }
function isValidUrl(v) { return /^https?:\/\/.+/i.test(v.trim()); }

export default function Affiliates() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = localStorage.getItem("token");
  const verticalId = searchParams.get("vertical_id") || "";
  const [affiliates, setAffiliates] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [links, setLinks] = useState([]);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkGeo, setLinkGeo] = useState("");
  const [linkCarrier, setLinkCarrier] = useState("");
  const [linkSort, setLinkSort] = useState({ field: "id", dir: "desc" });
  const [panelLoading, setPanelLoading] = useState(false);
  const [postbackDraft, setPostbackDraft] = useState("");
  const [savingPb, setSavingPb] = useState(false);

  useEffect(() => { if (!token) navigate("/login"); else load(); }, [searchParams.get("vertical_id")]);
  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2800); };
  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const load = async () => {
    try {
      const params = verticalId ? `?vertical_id=${verticalId}` : "";
      const res = await fetch(`${API_BASE}/api/affiliates${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === "SUCCESS") setAffiliates(data.data);
      else showToast(data.message || "Failed to load publishers", "error");
    } catch {
      showToast("Network error while loading publishers", "error");
    }
  };

  const add = async () => {
    if (!name.trim()) return showToast("Publisher name required", "error");
    if (email.trim() && !isValidEmail(email)) return showToast("Enter a valid email address", "error");
    setAdding(true);
    try {
      const res = await fetch(`${API_BASE}/api/affiliates`, {
        method: "POST", headers: authHeaders,
        body: JSON.stringify({ name: name.trim(), email: email.trim() || null }),
      });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        setAffiliates(a => [{ ...data.data, total_clicks: 0, total_conversions: 0, total_revenue: 0 }, ...a]);
        setName(""); setEmail("");
        showToast("Publisher added");
      } else {
        showToast(data.message || "Failed to add publisher", "error");
      }
    } catch {
      showToast("Network error while adding publisher", "error");
    } finally {
      setAdding(false);
    }
  };

  const toggleStatus = async (a) => {
    const ns = a.status === "active" ? "paused" : "active";
    const prev = affiliates;
    setAffiliates(l => l.map(x => x.id === a.id ? { ...x, status: ns } : x));
    try {
      const res = await fetch(`${API_BASE}/api/affiliates/${a.id}/status`, {
        method: "PATCH", headers: authHeaders,
        body: JSON.stringify({ status: ns }),
      });
      if (!res.ok) { setAffiliates(prev); showToast("Failed to update status", "error"); }
    } catch {
      setAffiliates(prev);
      showToast("Network error while updating status", "error");
    }
  };

  const copy = async (text, label = "Value") => {
    try { await navigator.clipboard.writeText(text); showToast(`${label} copied!`); }
    catch { showToast("Could not copy — please copy manually", "error"); }
  };

  const openAffiliate = async (a) => {
    if (expanded === a.id) { setExpanded(null); return; }
    setExpanded(a.id);
    setPostbackDraft(a.postback_url || "");
    setLinkSearch(""); setLinkGeo(""); setLinkCarrier(""); setLinkSort({ field: "id", dir: "desc" });
    setPanelLoading(true);
    try {
      const params = verticalId ? `?vertical_id=${verticalId}` : "";
      const res = await fetch(`${API_BASE}/api/affiliates/${a.id}/campaigns${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setLinks(data.status === "SUCCESS" ? data.data : []);
    } catch {
      showToast("Failed to load publisher details", "error");
    } finally {
      setPanelLoading(false);
    }
  };

  // One postback per publisher — this always updates the same field, never adds a new one.
  const savePostback = async (affId) => {
    const url = postbackDraft.trim();
    if (url && !isValidUrl(url)) return showToast("Postback URL must start with http:// or https://", "error");
    if (url && !url.includes("{click_id}")) return showToast("Postback URL must include the {click_id} macro", "error");
    setSavingPb(true);
    try {
      const res = await fetch(`${API_BASE}/api/affiliates/${affId}/postback`, {
        method: "PATCH", headers: authHeaders,
        body: JSON.stringify({ postback_url: url || null }),
      });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        setAffiliates(l => l.map(x => x.id === affId ? { ...x, postback_url: data.data.postback_url } : x));
        showToast(url ? "Postback URL saved" : "Postback URL cleared");
      } else {
        showToast(data.message || "Failed to save postback URL", "error");
      }
    } catch {
      showToast("Network error while saving postback URL", "error");
    } finally {
      setSavingPb(false);
    }
  };

  return (
    <CpaLayout>
      {toast && <div style={{ position: "fixed", top: 80, right: 24, zIndex: 9999, background: toast.type === "error" ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)", border: `1px solid ${toast.type === "error" ? "#fca5a5" : "#86efac"}`, color: toast.type === "error" ? "#dc2626" : "#16a34a", padding: "12px 20px", borderRadius: 12, fontSize: 13, maxWidth: 360 }}>{toast.msg}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={pageTitle}>Publishers</h1>
          <p style={{ color: "#9b7faa", fontSize: 13 }}>{affiliates.length} publishers · each has one postback URL — editable anytime, never duplicated</p>
          {verticalId && <p style={{ color: "#9b7faa", fontSize: 12, marginTop: 2 }}>Filtered to the vertical selected in the sidebar (only publishers with traffic/assignments there) — click it again to clear.</p>}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input style={{ ...input, width: 200 }} placeholder="Publisher name *" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
          <input style={{ ...input, width: 220 }} placeholder="Email (optional)" type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
          <button style={{ ...btn, opacity: adding ? 0.7 : 1 }} onClick={add} disabled={adding}>{adding ? "Adding..." : "+ Add Publisher"}</button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {affiliates.map(a => (
          <div key={a.id} style={{ background: "#fff", border: "1px solid #e8d0dc", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", cursor: "pointer", flexWrap: "wrap", gap: 10 }} onClick={() => openAffiliate(a)}>
              <div>
                <strong style={{ color: "#4a2f3f" }}>{a.name}</strong>
                <span style={{ color: "#b89ab0", fontSize: 12, marginLeft: 10 }}>{a.email || "—"}</span>
                {a.postback_url && <span style={{ marginLeft: 10, fontSize: 10, background: "rgba(34,197,94,0.1)", color: "#16a34a", padding: "2px 8px", borderRadius: 10 }}>postback set</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "#9b7faa", flexWrap: "wrap" }}>
                <span>Clicks: <b>{a.total_clicks}</b></span>
                <span>Conversions: <b>{a.total_conversions}</b></span>
                <span>Revenue: <b>{Number(a.total_revenue).toFixed(2)}</b></span>
                <span style={badge(a.status === "active" ? "green" : "red")} onClick={(e) => { e.stopPropagation(); toggleStatus(a); }}>
                  {a.status === "active" ? "● Active" : "● Paused"}
                </span>
                <span>{expanded === a.id ? "▲" : "▼"}</span>
              </div>
            </div>

            {expanded === a.id && (
              <div style={{ borderTop: "1px solid #f0e0e8", padding: "16px 18px", background: "#fdf6f9" }}>
                {panelLoading ? (
                  <div style={{ fontSize: 12, color: "#b89ab0" }}>Loading...</div>
                ) : (
                <>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontSize: 12, color: "#9b7faa" }}>Publisher Key:</span>
                  <code style={{ fontSize: 12, background: "#fff", padding: "3px 8px", borderRadius: 6 }}>{a.affiliate_key}</code>
                  <button style={{ ...btn, padding: "3px 10px", fontSize: 11 }} onClick={() => copy(a.affiliate_key, "Publisher key")}>Copy</button>
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, color: "#9b7faa", textTransform: "uppercase", marginBottom: 6 }}>Personalized Tracking Links</div>
                {(() => {
                  const geoOptions = [...new Set(links.map(l => l.geo).filter(Boolean))].sort();
                  const carrierOptions = [...new Set(links.map(l => l.carrier).filter(Boolean))].sort();
                  const filtered = links.filter(l => {
                    if (linkGeo && l.geo !== linkGeo) return false;
                    if (linkCarrier && l.carrier !== linkCarrier) return false;
                    if (linkSearch.trim()) {
                      const q = linkSearch.trim().toLowerCase();
                      if (!l.name?.toLowerCase().includes(q) && !l.advertiser_name?.toLowerCase().includes(q)) return false;
                    }
                    return true;
                  });
                  const sorted = [...filtered].sort((a2, b2) => {
                    const { field, dir } = linkSort;
                    const av = (field === "advertiser_name" ? a2.advertiser_name : field === "geo" ? a2.geo : field === "carrier" ? a2.carrier : field === "name" ? a2.name : a2.id) || "";
                    const bv = (field === "advertiser_name" ? b2.advertiser_name : field === "geo" ? b2.geo : field === "carrier" ? b2.carrier : field === "name" ? b2.name : b2.id) || "";
                    const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
                    return dir === "asc" ? cmp : -cmp;
                  });
                  const toggleSort = (field) => setLinkSort(s => ({ field, dir: s.field === field && s.dir === "desc" ? "asc" : "desc" }));
                  const arrow = (field) => linkSort.field === field ? (linkSort.dir === "desc" ? " ▼" : " ▲") : "";
                  const total = sorted.length;
                  const colHeader = { padding: "8px 10px", fontSize: 10, fontWeight: 700, color: "#9b7faa", textTransform: "uppercase", textAlign: "left", cursor: "pointer", whiteSpace: "nowrap" };
                  const colCell = { padding: "8px 10px", fontSize: 12, color: "#4a2f3f", borderTop: "1px solid #f0e0e8" };
                  return (
                    <>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        <input style={{ ...input, maxWidth: 180, padding: "5px 10px", fontSize: 12 }} placeholder="Search campaign/advertiser..." value={linkSearch} onChange={e => setLinkSearch(e.target.value)} />
                        <select style={{ ...input, maxWidth: 90, padding: "5px 8px", fontSize: 12 }} value={linkGeo} onChange={e => setLinkGeo(e.target.value)}>
                          <option value="">Geo</option>
                          {geoOptions.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <select style={{ ...input, maxWidth: 110, padding: "5px 8px", fontSize: 12 }} value={linkCarrier} onChange={e => setLinkCarrier(e.target.value)}>
                          <option value="">Carrier</option>
                          {carrierOptions.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div style={{ background: "#fff", border: "1px solid #eedde8", borderRadius: 10, overflow: "hidden", marginBottom: 18 }}>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ background: "#fdf6f9" }}>
                                <th style={colHeader}>S.No</th>
                                <th style={colHeader} onClick={() => toggleSort("advertiser_name")}>Advertiser{arrow("advertiser_name")}</th>
                                <th style={colHeader} onClick={() => toggleSort("geo")}>Geo{arrow("geo")}</th>
                                <th style={colHeader} onClick={() => toggleSort("carrier")}>Carrier{arrow("carrier")}</th>
                                <th style={colHeader} onClick={() => toggleSort("name")}>Campaign{arrow("name")}</th>
                                <th style={colHeader}>Tracking URL</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sorted.map((l, i) => (
                                <tr key={l.id}>
                                  <td style={colCell}>{total - i}</td>
                                  <td style={colCell}>{l.advertiser_name || "—"}</td>
                                  <td style={colCell}>{l.geo || "—"}</td>
                                  <td style={colCell}>{l.carrier || "—"}</td>
                                  <td style={colCell}>{l.name} <span style={{ color: "#b89ab0" }}>({l.vertical_name})</span></td>
                                  <td style={{ ...colCell, minWidth: 240 }}>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                      <code style={{ fontSize: 10.5, color: "#9b7faa", wordBreak: "break-all" }}>{l.tracking_url}</code>
                                      <button style={{ ...btn, padding: "3px 10px", fontSize: 11, whiteSpace: "nowrap" }} onClick={() => copy(l.tracking_url, "Tracking link")}>Copy</button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                              {!sorted.length && (
                                <tr><td colSpan={6} style={{ ...colCell, textAlign: "center", color: "#b89ab0" }}>{links.length ? "No links match your filters." : "No active campaigns yet."}</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  );
                })()}

                <div style={{ fontSize: 11, fontWeight: 700, color: "#9b7faa", textTransform: "uppercase", marginBottom: 6 }}>
                  Postback URL — we forward every conversion here (S2S). One per publisher — saving just updates it.
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <input
                    style={{ ...input, flex: 1, minWidth: 260 }}
                    placeholder="https://publisher-tracker.com/pb?click_id={click_id}&payout={payout}&status={status}"
                    value={postbackDraft}
                    onChange={e => setPostbackDraft(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && savePostback(a.id)}
                  />
                  <button style={{ ...btn, padding: "8px 16px", opacity: savingPb ? 0.7 : 1 }} onClick={() => savePostback(a.id)} disabled={savingPb}>
                    {savingPb ? "Saving..." : "Save"}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: "#b89ab0" }}>
                  Must include the <b>{"{click_id}"}</b> macro. Optional: <b>{"{payout}"}</b>, <b>{"{status}"}</b>, <b>{"{transaction_id}"}</b>. Leave empty and Save to clear it.
                </div>
                </>
                )}
              </div>
            )}
          </div>
        ))}
        {!affiliates.length && <div style={{ color: "#b89ab0", fontSize: 13 }}>No publishers yet — add one above.</div>}
      </div>
    </CpaLayout>
  );
}
