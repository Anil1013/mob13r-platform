/* ============================================
   Mob13r Shared Styles — Pastel Light Theme
   Palette: Soft cream/white bg + Peach/Lavender accents
   Font: Lora (serif)
   ============================================ */

const font = "'Lora', serif";

export const btn = { padding:"10px 20px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#e8856a,#d4709a)", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:font };
export const btnRed = { padding:"10px 20px", borderRadius:10, border:"1px solid rgba(220,100,100,0.25)", background:"rgba(220,100,100,0.08)", color:"#dc6464", fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:font };
export const input = { width:"100%", padding:"10px 14px", borderRadius:10, border:"1px solid rgba(210,160,180,0.35)", background:"#fff", color:"#5a3f50", fontSize:13, outline:"none", fontFamily:font };
export const table = { width:"100%", borderCollapse:"collapse" };
export const th = { padding:"12px 16px", textAlign:"left", fontSize:14, fontWeight:600, color:"#9b7faa", textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid rgba(210,160,180,0.25)", background:"#f5eef8", fontFamily:font };
export const td = { padding:"14px 16px", borderBottom:"1px solid rgba(210,160,180,0.15)", color:"#6b4f6a", fontSize:13, fontFamily:font };
export const page = { minHeight:"100vh", background:"#fdf6f9", padding:"32px 24px", fontFamily:font };
export const badge = (color) => ({
  display:"inline-flex", alignItems:"center", gap:6,
  padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:600,
  fontFamily:font,
  background: color==="green" ? "rgba(72,187,120,0.12)" : color==="red" ? "rgba(220,100,100,0.1)" : "rgba(180,140,220,0.12)",
  color: color==="green" ? "#2f9e60" : color==="red" ? "#dc6464" : "#8b60c8",
  border: "1px solid " + (color==="green" ? "rgba(72,187,120,0.3)" : color==="red" ? "rgba(220,100,100,0.25)" : "rgba(180,140,220,0.3)"),
});

/* ── Dashboard / page-level shared styles ── */
export const pageTitle = { color:"#4a2f3f", fontSize:24, fontWeight:700, marginBottom:18, fontFamily:"'Syne', sans-serif" };
export const topRow = { display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, marginBottom:18, flexWrap:"wrap" };
export const viewTabs = { display:"flex", gap:8, flexShrink:0 };
export const tabBtn = { padding:"9px 18px", borderRadius:10, border:"1px solid rgba(210,160,180,0.3)", background:"#fff", color:"#9b7faa", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:font };
export const tabBtnActive = { background:"linear-gradient(135deg,#e8856a,#d4709a)", color:"#fff", border:"1px solid #e8856a" };
export const statRow = { display:"flex", gap:12, flexWrap:"wrap" };
export const statCard = { background:"#fff", border:"1px solid rgba(210,160,180,0.25)", borderRadius:12, padding:"8px 16px", minWidth:110, boxShadow:"0 2px 8px rgba(210,160,180,0.12)" };
export const statLabel = { color:"#b89ab0", fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:3, fontFamily:font };
export const statValue = { fontSize:18, fontWeight:700, fontFamily:font };
export const filterBar = { marginBottom:18, display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" };
export const filterInput = { background:"#fff", border:"1px solid rgba(210,160,180,0.3)", color:"#5a3f50", padding:"8px 12px", borderRadius:10, fontSize:13, fontFamily:font };
export const filterSelect = { background:"#fff", border:"1px solid rgba(210,160,180,0.3)", color:"#5a3f50", padding:"8px 12px", borderRadius:10, fontSize:13, cursor:"pointer", fontFamily:font };
export const applyBtn = { background:"linear-gradient(135deg,#e8856a,#d4709a)", color:"#fff", border:"none", padding:"9px 20px", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:font };
export const exportBtn = { background:"#fff", border:"1px solid rgba(210,160,180,0.3)", color:"#9b7faa", padding:"9px 20px", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:font };
export const tableWrap = { background:"#fff", border:"1px solid rgba(210,160,180,0.2)", borderRadius:16, overflow:"hidden", width:"100%", boxShadow:"0 4px 20px rgba(210,160,180,0.1)" };
export const tableScroll = { overflowX:"auto", maxHeight:"70vh", overflowY:"auto" };
export const stickyTh = { padding:"12px 16px", textAlign:"left", fontSize:14, fontWeight:600, color:"#9b7faa", textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid rgba(210,160,180,0.2)", background:"#f5eef8", whiteSpace:"nowrap", position:"sticky", top:0, zIndex:2, fontFamily:font };
export const stickyTd = { padding:"11px 16px", color:"#6b4f6a", borderBottom:"1px solid rgba(210,160,180,0.12)", whiteSpace:"nowrap", fontSize:13, fontFamily:font };
export const totalRow = { background:"#fdf0f5" };
export const card = { background:"#fff", border:"1px solid rgba(210,160,180,0.2)", borderRadius:16, padding:24, fontFamily:font, boxShadow:"0 4px 20px rgba(210,160,180,0.1)" };
