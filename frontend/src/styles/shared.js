export const btn = { padding:"10px 20px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#3b82f6,#6366f1)", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" };
export const btnRed = { padding:"10px 20px", borderRadius:10, border:"1px solid rgba(239,68,68,0.2)", background:"rgba(239,68,68,0.08)", color:"#ef4444", fontSize:13, fontWeight:500, cursor:"pointer" };
export const input = { width:"100%", padding:"10px 14px", borderRadius:10, border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.04)", color:"#f1f5f9", fontSize:14, outline:"none" };
export const table = { width:"100%", borderCollapse:"collapse" };
export const th = { padding:"12px 16px", textAlign:"left", fontSize:14, fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid rgba(255,255,255,0.07)", background:"#0a0f1e" };
export const td = { padding:"14px 16px", borderBottom:"1px solid rgba(255,255,255,0.04)", color:"#94a3b8", fontSize:13 };
export const page = { minHeight:"100vh", background:"#050810", padding:"32px 24px" };
export const badge = (color) => ({
  display:"inline-flex", alignItems:"center", gap:6,
  padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:600,
  background: color==="green" ? "rgba(34,197,94,0.1)" : color==="red" ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.1)",
  color: color==="green" ? "#22c55e" : color==="red" ? "#ef4444" : "#3b82f6",
  border: "1px solid " + (color==="green" ? "rgba(34,197,94,0.2)" : color==="red" ? "rgba(239,68,68,0.2)" : "rgba(59,130,246,0.2)"),
});

/* ── Dashboard / page-level shared styles ── */
export const pageTitle = { color:"#cbd5e1", fontSize:24, fontWeight:700, marginBottom:18, fontFamily:"Syne,sans-serif" };
export const topRow = { display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, marginBottom:18, flexWrap:"wrap" };
export const viewTabs = { display:"flex", gap:8, flexShrink:0 };
export const tabBtn = { padding:"9px 18px", borderRadius:10, border:"1px solid rgba(255,255,255,0.08)", background:"#0d1326", color:"#64748b", fontSize:13, fontWeight:600, cursor:"pointer" };
export const tabBtnActive = { background:"#3b82f6", color:"#e2e8f0", border:"1px solid #3b82f6" };
export const statRow = { display:"flex", gap:12, flexWrap:"wrap" };
export const statCard = { background:"#0d1326", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"8px 16px", minWidth:110 };
export const statLabel = { color:"#475569", fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:3 };
export const statValue = { fontSize:18, fontWeight:700 };
export const filterBar = { marginBottom:18, display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" };
export const filterInput = { background:"#0d1326", border:"1px solid rgba(255,255,255,0.08)", color:"#94a3b8", padding:"8px 12px", borderRadius:10, fontSize:13, colorScheme:"dark" };
export const filterSelect = { background:"#0d1326", border:"1px solid rgba(255,255,255,0.08)", color:"#94a3b8", padding:"8px 12px", borderRadius:10, fontSize:13, cursor:"pointer" };
export const applyBtn = { background:"#3b82f6", color:"#e2e8f0", border:"none", padding:"9px 20px", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer" };
export const exportBtn = { background:"#0d1326", border:"1px solid rgba(255,255,255,0.08)", color:"#64748b", padding:"9px 20px", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer" };
export const tableWrap = { background:"#0d1326", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, overflow:"hidden", width:"100%" };
export const tableScroll = { overflowX:"auto", maxHeight:"70vh", overflowY:"auto" };
export const stickyTh = { padding:"12px 16px", textAlign:"left", fontSize:14, fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid rgba(255,255,255,0.07)", background:"#0a0f1e", whiteSpace:"nowrap", position:"sticky", top:0, zIndex:2 };
export const stickyTd = { padding:"11px 16px", color:"#94a3b8", borderBottom:"1px solid rgba(255,255,255,0.04)", whiteSpace:"nowrap", fontSize:13 };
export const totalRow = { background:"#0a0f1e" };
export const card = { background:"#0d1326", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:24 };
