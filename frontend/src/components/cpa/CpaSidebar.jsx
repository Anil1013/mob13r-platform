import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

export default function CpaSidebar({ onVerticalSelect, selectedVerticalId }) {
  const [verticals, setVerticals] = useState([]);
  const [showHidden, setShowHidden] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [adding, setAdding] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const load = async () => {
    const res = await fetch(`${API_BASE}/api/verticals`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.status === "SUCCESS") setVerticals(data.data);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (id) => {
    setVerticals(v => v.map(x => x.id === id ? { ...x, is_active: !x.is_active } : x));
    const res = await fetch(`${API_BASE}/api/verticals/${id}/toggle`, {
      method: "PATCH", headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) load();
  };

  const addVertical = async () => {
    if (!newName.trim() || !newCode.trim()) return;
    setAdding(true);
    const res = await fetch(`${API_BASE}/api/verticals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: newName, code: newCode }),
    });
    const data = await res.json();
    if (data.status === "SUCCESS") { setVerticals(v => [...v, data.data]); setNewName(""); setNewCode(""); }
    setAdding(false);
  };

  const visible = verticals.filter(v => showHidden || v.is_active);

  return (
    <div style={S.sidebar}>
      <div style={S.header}>
        <span style={S.headerTitle}>Verticals</span>
        <button style={S.eyeBtn} title={showHidden ? "Hide inactive" : "Show all (incl. hidden)"} onClick={() => setShowHidden(s => !s)}>
          {showHidden ? "👁️" : "👁️‍🗨️"}
        </button>
      </div>

      <div style={S.list}>
        {visible.map(v => (
          <div key={v.id} style={{ ...S.item, ...(selectedVerticalId === v.id ? S.itemActive : {}), opacity: v.is_active ? 1 : 0.45 }}>
            <div style={S.itemLeft} onClick={() => onVerticalSelect ? onVerticalSelect(v) : navigate(`/cpa/campaigns?vertical_id=${v.id}`)}>
              <span style={{ marginRight: 8 }}>{v.icon}</span>
              <span>{v.name}</span>
              <span style={S.countBadge}>{v.active_campaigns || 0}</span>
            </div>
            <button style={S.toggleBtn} title={v.is_active ? "Hide" : "Unhide"} onClick={() => toggle(v.id)}>
              {v.is_active ? "🙈" : "✅"}
            </button>
          </div>
        ))}
        {!visible.length && <div style={S.empty}>No verticals yet</div>}
      </div>

      <div style={S.addRow}>
        <input style={S.smallInput} placeholder="Name (e.g. CPL)" value={newName} onChange={e => setNewName(e.target.value)} />
        <input style={{ ...S.smallInput, width: 60 }} placeholder="Code" value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} />
        <button style={S.addBtn} onClick={addVertical} disabled={adding}>+</button>
      </div>

      <div style={S.divider} />

      <div style={S.navSection}>
        <NavLink to="/cpa/advertisers" style={({ isActive }) => ({ ...S.navLink, ...(isActive ? S.navLinkActive : {}) })}>🏢 Advertisers</NavLink>
        <NavLink to="/cpa/campaigns" style={({ isActive }) => ({ ...S.navLink, ...(isActive ? S.navLinkActive : {}) })}>📢 Campaigns</NavLink>
        <NavLink to="/cpa/affiliates" style={({ isActive }) => ({ ...S.navLink, ...(isActive ? S.navLinkActive : {}) })}>🤝 Publishers</NavLink>
        <NavLink to="/cpa/conversions" style={({ isActive }) => ({ ...S.navLink, ...(isActive ? S.navLinkActive : {}) })}>✅ Conversions</NavLink>
        <NavLink to="/cpa/reports" style={({ isActive }) => ({ ...S.navLink, ...(isActive ? S.navLinkActive : {}) })}>📊 Reports</NavLink>
      </div>
    </div>
  );
}

const S = {
  sidebar: { width: 240, minWidth: 240, background: "#fff", borderRight: "1px solid #e8d0dc", height: "calc(100vh - 64px)", position: "sticky", top: 64, display: "flex", flexDirection: "column", fontFamily: "'Lora',serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 16px 8px" },
  headerTitle: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9b7faa" },
  eyeBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 14 },
  list: { flex: "0 0 auto", padding: "0 8px", display: "flex", flexDirection: "column", gap: 2, maxHeight: 260, overflowY: "auto" },
  item: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 10, cursor: "pointer" },
  itemLeft: { display: "flex", alignItems: "center", flex: 1, fontSize: 13, color: "#4a2f3f", fontWeight: 600 },
  itemActive: { background: "rgba(232,133,106,0.1)" },
  countBadge: { marginLeft: 8, fontSize: 10, background: "#f5eef8", color: "#9b7faa", padding: "1px 7px", borderRadius: 10, fontWeight: 700 },
  toggleBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 13, opacity: 0.7 },
  empty: { padding: "8px 10px", fontSize: 12, color: "#b89ab0" },
  addRow: { display: "flex", gap: 6, padding: "10px 16px" },
  smallInput: { flex: 1, padding: "6px 8px", borderRadius: 8, border: "1px solid rgba(210,160,180,0.4)", fontSize: 12, outline: "none", fontFamily: "'Lora',serif" },
  addBtn: { padding: "6px 12px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#e8856a,#d4709a)", color: "#fff", cursor: "pointer", fontWeight: 700 },
  divider: { height: 1, background: "#f0e0e8", margin: "8px 16px" },
  navSection: { display: "flex", flexDirection: "column", padding: "0 8px", gap: 2 },
  navLink: { padding: "9px 10px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#4a2f3f", textDecoration: "none" },
  navLinkActive: { background: "linear-gradient(135deg,#e8856a,#d4709a)", color: "#fff" },
};
