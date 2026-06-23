/* ============================================
   Mob13r Shared Styles — Pastel Bloom Theme
   Palette: Deep plum bg + Peach/Lavender/Sky accents
   Font: Lora (serif)
   ============================================ */

const font = "'Lora', serif";

export const btn = { padding:"10px 20px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#e8856a,#d4709a)", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:font };
export const btnRed = { padding:"10px 20px", borderRadius:10, border:"1px solid rgba(255,144,144,0.25)", background:"rgba(255,144,144,0.08)", color:"#ff9090", fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:font };
export const input = { width:"100%", padding:"10px 14px", borderRadius:10, border:"1px solid rgba(255,183,160,0.2)", background:"rgba(255,255,255,0.04)", color:"#e8d0d8", fontSize:13, outline:"none", fontFamily:font };
export const table = { width:"100%", borderCollapse:"collapse" };
export const th = { padding:"12px 16px", textAlign:"left", fontSize:14, fontWeight:600, color:"#b4a0ff", textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid rgba(255,183,160,0.1)", background:"#1e1528", fontFamily:font };
export const td = { padding:"14px 16px", borderBottom:"1px solid rgba(255,183,160,0.06)", color:"#e8d0d8", fontSize:13, fontFamily:font };
export const page = { minHeight:"100vh", background:"#1a1520", padding:"32px 24px", fontFamily:font };
export const badge = (color) => ({
  display:"inline-flex", alignItems:"center", gap:6,
  padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:600,
  fontFamily:font,
  background: color==="green" ? "rgba(160,232,192,0.12)" : color==="red" ? "rgba(255,144,144,0.1)" : "rgba(180,160,255,0.12)",
  color: color==="green" ? "#a0e8c0" : color==="red" ? "#ff9090" : "#b4a0ff",
  border: "1px solid " + (color==="green" ? "rgba(160,232,192,0.25)" : color==="red" ? "rgba(255,144,144,0.2)" : "rgba(180,160,255,0.25)"),
});

/* ── Dashboard / page-level shared styles ── */
export const pageTitle = { color:"#fde8e0", fontSize:24, fontWeight:700, marginBottom:18, fontFamily:"'Syne', sans-serif" };
export const topRow = { display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, marginBottom:18, flexWrap:"wrap" };
export const viewTabs = { display:"flex", gap:8, flexShrink:0 };
export const tabBtn = { padding:"9px 18px", borderRadius:10, border:"1px solid rgba(255,183,160,0.18)", background:"#221a2e", color:"#c4a8b8", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:font };
export const tabBtnActive = { background:"linear-gradient(135deg,#e8856a,#d4709a)", color:"#fff", border:"1px solid #e8856a" };
export const statRow = { display:"flex", gap:12, flexWrap:"wrap" };
export const statCard = { background:"#221a2e", border:"1px solid rgba(255,183,160,0.12)", borderRadius:12, padding:"8px 16px", minWidth:110 };
export const statLabel = { color:"#8a7090", fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:3, fontFamily:font };
export const statValue = { fontSize:18, fontWeight:700, fontFamily:font };
export const filterBar = { marginBottom:18, display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" };
export const filterInput = { background:"#221a2e", border:"1px solid rgba(255,183,160,0.15)", color:"#e8d0d8", padding:"8px 12px", borderRadius:10, fontSize:13, colorScheme:"dark", fontFamily:font };
export const filterSelect = { background:"#221a2e", border:"1px solid rgba(255,183,160,0.15)", color:"#e8d0d8", padding:"8px 12px", borderRadius:10, fontSize:13, cursor:"pointer", fontFamily:font };
export const applyBtn = { background:"linear-gradient(135deg,#e8856a,#d4709a)", color:"#fff", border:"none", padding:"9px 20px", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:font };
export const exportBtn = { background:"#221a2e", border:"1px solid rgba(255,183,160,0.15)", color:"#8a7090", padding:"9px 20px", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:font };
export const tableWrap = { background:"#221a2e", border:"1px solid rgba(255,183,160,0.1)", borderRadius:16, overflow:"hidden", width:"100%" };
export const tableScroll = { overflowX:"auto", maxHeight:"70vh", overflowY:"auto" };
export const stickyTh = { padding:"12px 16px", textAlign:"left", fontSize:14, fontWeight:600, color:"#b4a0ff", textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid rgba(255,183,160,0.1)", background:"#1e1528", whiteSpace:"nowrap", position:"sticky", top:0, zIndex:2, fontFamily:font };
export const stickyTd = { padding:"11px 16px", color:"#e8d0d8", borderBottom:"1px solid rgba(255,183,160,0.06)", whiteSpace:"nowrap", fontSize:13, fontFamily:font };
export const totalRow = { background:"#1e1528" };
export const card = { background:"#221a2e", border:"1px solid rgba(255,183,160,0.1)", borderRadius:16, padding:24, fontFamily:font };
