import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";
const CODE_RE = /^[A-Za-z0-9_-]{2,20}$/;
// Pages whose data is filtered by the sidebar's selected vertical — if the
// user is already ON one of these when they click a vertical header, that
// page's own URL needs updating too (not just the sidebar's local state),
// otherwise its data silently keeps showing the OLD/no vertical filter.
const SCOPED_PATHS = ["/cpa/campaigns", "/cpa/traffic-groups", "/cpa/affiliates", "/cpa/assignments", "/cpa/conversions", "/cpa/reports", "/cpa/advertisers"];

export default function CpaSidebar() {
  const [verticals, setVerticals] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [showHidden, setShowHidden] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState(null);
  // Collapsed = icon-only rail. Remembers the user's preference across
  // page loads/navigations via localStorage.
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("cpa_sidebar_collapsed") === "1");
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user")) || { email: "Admin" };

  const flashError = (msg) => { setError(msg); setTimeout(() => setError(null), 3000); };

  const toggleCollapsed = () => {
    setCollapsed(c => {
      localStorage.setItem("cpa_sidebar_collapsed", c ? "0" : "1");
      return !c;
    });
  };

  // Expanding/collapsing a vertical updates local sidebar state as before —
  // but if we're already sitting on a scoped page (Publishers, Campaigns,
  // Reports, etc.), that page's own URL needs the vertical_id too, or its
  // data keeps showing whatever it last loaded (no re-fetch happens
  // otherwise, since nothing about that page's own state changed).
  const toggleVertical = (id) => {
    const newId = expandedId === id ? null : id;
    setExpandedId(newId);
    if (SCOPED_PATHS.includes(location.pathname)) {
      navigate(newId ? `${location.pathname}?vertical_id=${newId}` : location.pathname, { replace: true });
    }
  };

  // In collapsed (icon-only) mode there's no room for the accordion body,
  // so clicking a vertical's icon both selects it AND jumps straight to
  // its Campaigns page, instead of just toggling the accordion open.
  const clickVerticalCollapsed = (v) => {
    setExpandedId(v.id);
    navigate(`/cpa/campaigns?vertical_id=${v.id}`);
  };

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/verticals`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        setVerticals(data.data);
        // auto-expand the vertical matching the current query string, if any
        const params = new URLSearchParams(location.search);
        const vid = params.get("vertical_id");
        if (vid) setExpandedId(Number(vid));
        else if (data.data.length) setExpandedId(data.data.find(v => v.is_active)?.id ?? null);
      }
    } catch { /* sidebar stays empty, non-blocking for rest of the app */ }
  };
  useEffect(() => { load(); }, []);

  const toggleActive = async (id, e) => {
    e.stopPropagation();
    const prev = verticals;
    setVerticals(v => v.map(x => x.id === id ? { ...x, is_active: !x.is_active } : x));
    try {
      const res = await fetch(`${API_BASE}/api/verticals/${id}/toggle`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setVerticals(prev); flashError("Failed to toggle vertical"); }
    } catch {
      setVerticals(prev);
      flashError("Network error");
    }
  };

  const addVertical = async () => {
    if (!newName.trim()) return flashError("Enter a name");
    if (!CODE_RE.test(newCode.trim())) return flashError("Code: 2-20 letters/numbers, e.g. CPL");
    setAdding(true);
    try {
      const res = await fetch(`${API_BASE}/api/verticals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName.trim(), code: newCode.trim() }),
      });
      const data = await res.json();
      if (data.status === "SUCCESS") { setVerticals(v => [...v, data.data]); setNewName(""); setNewCode(""); setShowAddForm(false); }
      else flashError(data.message || "Failed to add vertical");
    } catch {
      flashError("Network error");
    } finally {
      setAdding(false);
    }
  };

  const visible = verticals.filter(v => showHidden || v.is_active);
  const isPathActive = (path) => location.pathname === path;

  const NAV_ITEMS = [
    { to: "/cpa/advertisers", icon: "🏢", label: "Advertisers", scoped: true },
    { to: "/cpa/campaigns", icon: "📢", label: "All Campaigns", scoped: true },
    { to: "/cpa/traffic-groups", icon: "🔀", label: "Traffic Groups", scoped: true },
    { to: "/cpa/affiliates", icon: "🤝", label: "Publishers", scoped: true },
    { to: "/cpa/assignments", icon: "🎯", label: "Assignments", scoped: true },
    { to: "/cpa/conversions", icon: "✅", label: "Conversions", scoped: true },
    { to: "/cpa/reports", icon: "📊", label: "Reports", scoped: true },
  ];

  // ============ COLLAPSED (icon-only rail) ============
  if (collapsed) {
    return (
      <div style={S.sidebarCollapsed}>
        <button style={S.collapseBtnRail} onClick={toggleCollapsed} title="Expand sidebar">»</button>

        <div style={S.brandDotWrap} title="CPA Suite"><span style={S.brandDot} /></div>

        <div style={S.avatarWrap} title={user.email}>
          <div style={S.avatar}>{(user.email || "A")[0].toUpperCase()}</div>
        </div>

        <div
          style={{ ...S.railIcon, ...(isPathActive("/cpa/overview") ? S.railIconActive : {}) }}
          onClick={() => navigate("/cpa/overview")}
          title="Overview — All Verticals Revenue"
        >📊</div>

        <div style={S.railDivider} />

        {visible.map(v => (
          <div
            key={v.id}
            style={{ ...S.railIcon, ...(expandedId === v.id ? S.railIconActive : {}), opacity: v.is_active ? 1 : 0.4 }}
            onClick={() => clickVerticalCollapsed(v)}
            title={v.name}
          >{v.icon}</div>
        ))}

        <div style={S.railDivider} />

        {NAV_ITEMS.map(item => {
          const target = item.scoped && expandedId ? `${item.to}?vertical_id=${expandedId}` : item.to;
          return (
            <div
              key={item.to}
              style={{ ...S.railIcon, ...(isPathActive(item.to) ? S.railIconActive : {}) }}
              onClick={() => navigate(target)}
              title={item.label}
            >{item.icon}</div>
          );
        })}
      </div>
    );
  }

  // ============ EXPANDED (full sidebar) ============
  return (
    <div style={S.sidebar}>
      <div style={S.brand}>
        <span style={S.brandDot} />
        <span style={S.brandText}>CPA Suite</span>
        <button style={S.collapseBtn} onClick={toggleCollapsed} title="Collapse sidebar">«</button>
      </div>

      <div style={S.userBox}>
        <div style={S.avatar}>{(user.email || "A")[0].toUpperCase()}</div>
        <div style={{ overflow: "hidden" }}>
          <div style={S.userEmail}>{user.email}</div>
          <div style={S.userSub}>Admin</div>
        </div>
      </div>

      <div style={{ padding: "0 10px 6px" }}>
        <div
          style={{ ...S.navLink, ...(isPathActive("/cpa/overview") ? S.navLinkActive : {}), display: "flex", alignItems: "center" }}
          onClick={() => navigate("/cpa/overview")}
        >
          <span style={{ marginRight: 10 }}>📊</span>Overview — All Verticals Revenue
        </div>
      </div>

      {error && <div style={S.errorBox}>{error}</div>}

      <div style={S.sectionLabel}>
        <span>VERTICALS</span>
        <button style={S.eyeBtn} title={showHidden ? "Hide inactive" : "Show all (incl. hidden)"} onClick={() => setShowHidden(s => !s)}>
          {showHidden ? "👁️" : "👁️‍🗨️"}
        </button>
      </div>

      <div style={S.accordion}>
        {visible.map(v => {
          const open = expandedId === v.id;
          return (
            <div key={v.id} style={{ opacity: v.is_active ? 1 : 0.4 }}>
              <div style={{ ...S.accHeader, ...(open ? S.accHeaderOpen : {}) }} onClick={() => toggleVertical(v.id)}>
                <span style={S.accIcon}>{v.icon}</span>
                <span style={S.accLabel}>{v.name}</span>
                <span style={S.accCount}>{v.active_campaigns || 0}</span>
                <button style={S.hideBtn} title={v.is_active ? "Hide from sidebar" : "Unhide"} onClick={(e) => toggleActive(v.id, e)}>
                  {v.is_active ? "🙈" : "✅"}
                </button>
                <span style={{ ...S.chevron, transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>⌄</span>
              </div>
              {open && (
                <div style={S.accBody}>
                  <div
                    style={{ ...S.subLink, ...(isPathActive("/cpa/campaigns") ? S.subLinkActive : {}) }}
                    onClick={() => navigate(`/cpa/campaigns?vertical_id=${v.id}`)}
                  >
                    📢 Campaigns
                  </div>
                  <div style={S.subLink} onClick={() => navigate(`/cpa/campaigns?vertical_id=${v.id}&new=1`)}>
                    ➕ New Campaign
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!visible.length && <div style={S.empty}>No verticals yet</div>}
      </div>

      {showAddForm ? (
        <div style={S.addRow}>
          <input style={S.smallInput} placeholder="Name (e.g. CPL)" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && addVertical()} />
          <input style={{ ...S.smallInput, width: 54 }} placeholder="Code" maxLength={20} value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === "Enter" && addVertical()} />
          <button style={{ ...S.addBtn, opacity: adding ? 0.7 : 1 }} onClick={addVertical} disabled={adding}>{adding ? "…" : "✓"}</button>
          <button style={S.cancelBtn} onClick={() => setShowAddForm(false)}>✕</button>
        </div>
      ) : (
        <div style={S.addTrigger} onClick={() => setShowAddForm(true)}>+ Add Vertical</div>
      )}

      <div style={S.divider} />

      <div style={S.sectionLabel}><span>GENERAL</span></div>
      {expandedId && (
        <div style={S.scopedNote}>
          Showing <b style={{ color: "#f1f5f9" }}>{verticals.find(v => v.id === expandedId)?.name}</b> only across every section below
        </div>
      )}
      <div style={S.navSection}>
        {NAV_ITEMS.map(item => {
          const target = item.scoped && expandedId ? `${item.to}?vertical_id=${expandedId}` : item.to;
          return (
            <div key={item.to} style={{ ...S.navLink, ...(isPathActive(item.to) ? S.navLinkActive : {}) }} onClick={() => navigate(target)}>
              <span style={{ marginRight: 10 }}>{item.icon}</span>{item.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ACCENT = "#7c3aed";
const ACCENT_GRAD = "linear-gradient(135deg,#7c3aed,#d4709a)";
// Lighter, purple-tinted dark surface — was a very dark flat navy (#161b28),
// now a softer dark plum that matches the app's purple brand identity
// instead of feeling like an unrelated black panel.
const SURFACE = "#332b42";
const SURFACE_RAISED = "#3c3350";

const S = {
  sidebar: { width: 260, minWidth: 260, background: SURFACE, height: "calc(100vh - 64px)", position: "sticky", top: 64, display: "flex", flexDirection: "column", fontFamily: "'Lora',serif", overflowY: "auto", overflowX: "hidden", color: "#cbd5e1" },
  sidebarCollapsed: { width: 68, minWidth: 68, background: SURFACE, height: "calc(100vh - 64px)", position: "sticky", top: 64, display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "'Lora',serif", overflowY: "auto", overflowX: "hidden", padding: "14px 0", gap: 4 },
  collapseBtnRail: { width: 28, height: 28, borderRadius: 8, border: "none", background: SURFACE_RAISED, color: "#cbd5e1", cursor: "pointer", fontSize: 13, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center" },
  collapseBtn: { marginLeft: "auto", width: 24, height: 24, borderRadius: 7, border: "none", background: SURFACE_RAISED, color: "#cbd5e1", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  brandDotWrap: { marginBottom: 10 },
  railIcon: { width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, cursor: "pointer", flexShrink: 0 },
  railIconActive: { background: "rgba(124,58,237,0.22)" },
  railDivider: { width: 28, height: 1, background: "rgba(255,255,255,0.1)", margin: "6px 0" },
  avatarWrap: { marginBottom: 10 },
  brand: { display: "flex", alignItems: "center", gap: 8, padding: "18px 14px 14px 18px" },
  brandDot: { width: 10, height: 10, borderRadius: "50%", background: ACCENT, boxShadow: `0 0 10px ${ACCENT}`, display: "inline-block" },
  brandText: { fontFamily: "'Lora',serif", fontWeight: 800, fontSize: 16, color: "#f1f5f9", letterSpacing: "-0.3px" },
  userBox: { display: "flex", alignItems: "center", gap: 10, padding: "0 18px 16px" },
  avatar: { width: 34, height: 34, borderRadius: "50%", background: ACCENT_GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: 14, flexShrink: 0 },
  userEmail: { fontSize: 12, color: "#e2e8f0", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 },
  userSub: { fontSize: 10, color: "#a394b5" },
  errorBox: { margin: "0 16px 10px", padding: "6px 10px", fontSize: 11, color: "#fca5a5", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8 },
  sectionLabel: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 18px", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#a394b5" },
  eyeBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#a394b5" },
  accordion: { display: "flex", flexDirection: "column", padding: "4px 10px", gap: 3 },
  accHeader: { display: "flex", alignItems: "center", gap: 6, padding: "10px 10px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#e2e8f0" },
  accHeaderOpen: { background: SURFACE_RAISED },
  accIcon: { fontSize: 14 },
  accLabel: { flex: 1 },
  accCount: { fontSize: 10, background: "rgba(124,58,237,0.2)", color: "#c4b5fd", padding: "1px 7px", borderRadius: 10, fontWeight: 700, marginRight: 4 },
  hideBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 12, opacity: 0.6, padding: 2 },
  chevron: { fontSize: 14, color: "#a394b5", transition: "transform 0.15s ease" },
  accBody: { display: "flex", flexDirection: "column", paddingLeft: 30, marginTop: 2, marginBottom: 4, gap: 1 },
  subLink: { padding: "8px 10px", borderRadius: 8, fontSize: 12, color: "#c4b8d6", cursor: "pointer", fontWeight: 500 },
  subLinkActive: { color: "#f1f5f9", background: "rgba(124,58,237,0.18)" },
  empty: { padding: "8px 10px", fontSize: 12, color: "#a394b5" },
  addTrigger: { margin: "4px 18px 8px", fontSize: 12, color: "#a394b5", cursor: "pointer", fontWeight: 600 },
  addRow: { display: "flex", gap: 5, padding: "6px 18px 10px" },
  smallInput: { flex: 1, padding: "6px 8px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: SURFACE_RAISED, color: "#e2e8f0", fontSize: 12, outline: "none", fontFamily: "'Lora',serif" },
  addBtn: { padding: "6px 10px", borderRadius: 8, border: "none", background: ACCENT, color: "#fff", cursor: "pointer", fontWeight: 800 },
  cancelBtn: { padding: "6px 10px", borderRadius: 8, border: "none", background: SURFACE_RAISED, color: "#c4b8d6", cursor: "pointer", fontWeight: 700 },
  divider: { height: 1, background: "rgba(255,255,255,0.1)", margin: "10px 18px" },
  scopedNote: { margin: "0 10px 8px", fontSize: 10, color: "#e2e8f0", background: SURFACE_RAISED, padding: "6px 10px", borderRadius: 8 },
  navSection: { display: "flex", flexDirection: "column", padding: "2px 10px 16px", gap: 2 },
  navLink: { padding: "9px 10px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#c4b8d6", cursor: "pointer" },
  navLinkActive: { background: "rgba(124,58,237,0.2)", color: "#f1f5f9" },
};
