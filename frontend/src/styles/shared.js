
export const btn = { padding:"10px 20px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#3b82f6,#6366f1)", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" };
export const btnRed = { padding:"10px 20px", borderRadius:10, border:"1px solid rgba(239,68,68,0.2)", background:"rgba(239,68,68,0.08)", color:"#ef4444", fontSize:13, fontWeight:500, cursor:"pointer" };
export const input = { width:"100%", padding:"10px 14px", borderRadius:10, border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.04)", color:"#f1f5f9", fontSize:14, outline:"none" };
export const table = { width:"100%", borderCollapse:"collapse", background:"#0d1326", borderRadius:16, overflow:"hidden" };
export const th = { padding:"12px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#475569", textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid rgba(255,255,255,0.07)" };
export const td = { padding:"14px 16px", borderBottom:"1px solid rgba(255,255,255,0.04)", color:"#94a3b8", fontSize:13 };
export const page = { minHeight:"100vh", background:"#050810", padding:"32px 24px" };
export const badge = (color) => ({
  display:"inline-flex", alignItems:"center", gap:6,
  padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:600,
  background: color==="green"?"rgba(34,197,94,0.1)":color==="red"?"rgba(239,68,68,0.1)":"rgba(59,130,246,0.1)",
  color: color==="green"?"#22c55e":color==="red"?"#ef4444":"#3b82f6",
  border: "1px solid " + (color==="green"?"rgba(34,197,94,0.2)":color==="red"?"rgba(239,68,68,0.2)":"rgba(59,130,246,0.2)"),
});
