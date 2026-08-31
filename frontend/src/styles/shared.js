/* ============================================
   Mob13r Shared Styles — Modern SaaS Theme
   ============================================ */

const font = "'Inter', -apple-system, sans-serif";
const headingFont = "'Syne', sans-serif";

const grad = "linear-gradient(135deg,#7c3aed,#d4709a)";

export const btn = { padding:"11px 22px", borderRadius:12, border:"none", background:grad, color:"#fff", fontSize:13.5, fontWeight:600, cursor:"pointer", fontFamily:font, boxShadow:"0 4px 14px rgba(124,58,237,0.28)", letterSpacing:"0.01em" };
export const btnRed = { padding:"11px 22px", borderRadius:12, border:"1px solid rgba(220,90,90,0.25)", background:"rgba(220,90,90,0.06)", color:"#dc5a5a", fontSize:13.5, fontWeight:600, cursor:"pointer", fontFamily:font };
export const input = { width:"100%", padding:"11px 15px", borderRadius:12, border:"1.5px solid #ecdde6", background:"#fff", color:"#3d2436", fontSize:13.5, outline:"none", fontFamily:font, boxShadow:"0 1px 2px rgba(124,58,237,0.04)" };
export const table = { width:"100%", borderCollapse:"separate", borderSpacing:0 };
export const th = { padding:"14px 18px", textAlign:"left", fontSize:11.5, fontWeight:700, color:"#8b6a9a", textTransform:"uppercase", letterSpacing:"0.07em", background:"#faf6fb", fontFamily:font, borderBottom:"1.5px solid #eee0ea" };
export const td = { padding:"13px 18px", color:"#3d2436", fontSize:13.5, fontFamily:font, borderBottom:"1px solid #f4ecf1", background:"#fff", fontWeight:500 };
export const page = { minHeight:"100vh", background:"linear-gradient(180deg,#fdf8fb 0%,#fbf3f7 100%)", padding:"32px 28px", fontFamily:font };
export const badge = (color) => ({
  display:"inline-flex", alignItems:"center", gap:6,
  padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:700,
  fontFamily:font, letterSpacing:"0.02em",
  background: color==="green" ? "linear-gradient(135deg,#e8faf0,#d5f5e3)" : color==="red" ? "linear-gradient(135deg,#fdecec,#fbdcdc)" : "linear-gradient(135deg,#f3ebfa,#ede0f7)",
  color: color==="green" ? "#1e8449" : color==="red" ? "#c0392b" : "#7c3aed",
  border: "1px solid " + (color==="green" ? "rgba(46,204,113,0.25)" : color==="red" ? "rgba(220,90,90,0.22)" : "rgba(124,58,237,0.2)"),
});

/* ── Dashboard / page-level shared styles ── */
export const pageTitle = { color:"#2d1b30", fontSize:26, fontWeight:800, marginBottom:20, fontFamily:headingFont, letterSpacing:"-0.01em" };
export const topRow = { display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, marginBottom:20, flexWrap:"wrap" };
export const viewTabs = { display:"flex", gap:6, flexShrink:0, background:"#fff", padding:5, borderRadius:14, border:"1px solid #eee0ea", boxShadow:"0 2px 8px rgba(124,58,237,0.06)" };
export const tabBtn = { padding:"9px 18px", borderRadius:10, border:"none", background:"transparent", color:"#9b7faa", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:font };
export const tabBtnActive = { background:grad, color:"#fff", boxShadow:"0 3px 10px rgba(124,58,237,0.3)" };
export const statRow = { display:"flex", gap:14, flexWrap:"wrap" };
export const statCard = { background:"#fff", border:"1px solid #f0e5ec", borderRadius:16, padding:"14px 20px", minWidth:120, boxShadow:"0 4px 16px rgba(124,58,237,0.08), 0 1px 3px rgba(0,0,0,0.03)" };
export const statLabel = { color:"#a888b3", fontSize:10.5, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5, fontFamily:font };
export const statValue = { fontSize:20, fontWeight:800, fontFamily:headingFont, color:"#2d1b30" };
export const filterBar = { marginBottom:20, display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" };
export const filterInput = { background:"#fff", border:"1.5px solid #ecdde6", color:"#3d2436", padding:"9px 14px", borderRadius:11, fontSize:13, fontFamily:font };
export const filterSelect = { background:"#fff", border:"1.5px solid #ecdde6", color:"#3d2436", padding:"9px 14px", borderRadius:11, fontSize:13, cursor:"pointer", fontFamily:font };
export const applyBtn = { background:grad, color:"#fff", border:"none", padding:"10px 22px", borderRadius:11, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:font, boxShadow:"0 4px 12px rgba(124,58,237,0.25)" };
export const exportBtn = { background:"#fff", border:"1.5px solid #ecdde6", color:"#8b6a9a", padding:"10px 22px", borderRadius:11, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:font };
export const tableWrap = { background:"#fff", border:"1px solid #f0e5ec", borderRadius:18, overflow:"hidden", width:"100%", boxShadow:"0 8px 30px rgba(124,58,237,0.09), 0 2px 6px rgba(0,0,0,0.03)" };
export const tableScroll = { overflowX:"auto", maxHeight:"70vh", overflowY:"auto" };
export const stickyTh = { padding:"14px 18px", textAlign:"left", fontSize:11.5, fontWeight:700, color:"#8b6a9a", textTransform:"uppercase", letterSpacing:"0.07em", background:"#faf6fb", whiteSpace:"nowrap", position:"sticky", top:0, zIndex:2, fontFamily:font, borderBottom:"1.5px solid #eee0ea" };
export const stickyTd = { padding:"12px 18px", color:"#3d2436", whiteSpace:"nowrap", fontSize:13.5, fontFamily:font, borderBottom:"1px solid #f4ecf1", background:"#fff", fontWeight:500 };
export const totalRow = { background:"linear-gradient(135deg,#faf0f6,#f5ebf9)" };
export const card = { background:"#fff", border:"1px solid #f0e5ec", borderRadius:18, padding:26, fontFamily:font, boxShadow:"0 8px 28px rgba(124,58,237,0.09), 0 2px 6px rgba(0,0,0,0.03)" };
