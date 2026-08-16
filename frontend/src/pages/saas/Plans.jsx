import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
const API_BASE = "https://backend.mob13r.com";

const ICONS = { CPA: "💰", CPI: "📲", CPS: "🛒", DCB: "📶", MVAS: "📱" };

export default function Plans() {
  const [modulePlans, setModulePlans] = useState([]);
  const [activeCodes, setActiveCodes] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    const token = localStorage.getItem("token");
    Promise.all([
      fetch(`${API_BASE}/api/saas/module-plans`).then(r => r.json()),
      fetch(`${API_BASE}/api/saas/my-modules`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([plansRes, myRes]) => {
      if (plansRes.success) setModulePlans(plansRes.data);
      if (myRes.success) { setActiveCodes(myRes.data.active_codes); setSelected(myRes.data.active_codes); }
    }).catch(() => showToast("Failed to load plans", "error"))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (code) => setSelected(s => s.includes(code) ? s.filter(c => c !== code) : [...s, code]);
  const total = modulePlans.filter(m => selected.includes(m.code)).reduce((sum, m) => sum + Number(m.price_monthly), 0);
  const changed = JSON.stringify([...selected].sort()) !== JSON.stringify([...activeCodes].sort());

  const requestChange = async () => {
    if (!selected.length) return showToast("Select at least one module", "error");
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/saas/plan-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ modules: selected }),
      });
      const data = await res.json();
      if (data.success) showToast(data.message || "Request sent — admin will review shortly");
      else showToast(data.message || "Failed to submit request", "error");
    } catch {
      showToast("Network error while submitting request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <div style={S.page}>
        <div style={S.glow1}/><div style={S.glow2}/>
        {toast && (
          <div style={{position:"fixed",top:24,right:24,zIndex:9999,background:toast.type==="error"?"rgba(239,68,68,0.15)":"rgba(34,197,94,0.15)",border:`1px solid ${toast.type==="error"?"rgba(239,68,68,0.3)":"rgba(34,197,94,0.3)"}`,color:toast.type==="error"?"#ef4444":"#22c55e",padding:"12px 20px",borderRadius:12,fontSize:13,fontWeight:500,maxWidth:380}}>
            {toast.msg}
          </div>
        )}
        <div style={S.inner}>
          <div style={{textAlign:"center",marginBottom:40}}>
            <h1 style={S.title}>Your Modules</h1>
            <p style={S.sub}>Pay only for what you use — toggle modules on or off, we'll review and apply your change</p>
          </div>

          {loading ? (
            <p style={{textAlign:"center",color:"#475569"}}>Loading...</p>
          ) : (
            <>
              <div style={S.grid}>
                {modulePlans.map(m => {
                  const isActive = activeCodes.includes(m.code);
                  const isSelected = selected.includes(m.code);
                  return (
                    <div key={m.code} onClick={() => toggle(m.code)}
                      style={{...S.card, border:`1px solid ${isSelected ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.07)"}`, cursor:"pointer", position:"relative"}}>
                      {isActive && <div style={S.currentBadge}>Currently Active</div>}
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontSize:24}}>{ICONS[m.code] || "📦"}</span>
                        <h2 style={S.planName}>{m.name}</h2>
                        <span style={{marginLeft:"auto", width:22, height:22, borderRadius:6, border:`2px solid ${isSelected?"#22c55e":"rgba(255,255,255,0.15)"}`, background: isSelected?"#22c55e":"transparent", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:13, fontWeight:800}}>
                          {isSelected ? "✓" : ""}
                        </span>
                      </div>
                      <div style={S.price}>
                        <span style={S.dollar}>$</span>
                        <span style={S.amount}>{m.price_monthly}</span>
                        <span style={S.period}>/mo</span>
                      </div>
                      <p style={S.desc}>{m.description}</p>
                      <div style={S.limitsRow}>
                        {m.max_campaigns != null && <span style={S.limitPill}>{m.max_campaigns} campaigns</span>}
                        {m.max_publishers != null && <span style={S.limitPill}>{m.max_publishers} publishers</span>}
                        {m.max_offers != null && <span style={S.limitPill}>{m.max_offers} offers</span>}
                        {m.monthly_conversions != null && <span style={S.limitPill}>{m.monthly_conversions.toLocaleString()} conv/mo</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={S.summaryBar}>
                <div>
                  <div style={{fontSize:12,color:"#94a3b8"}}>Selected modules</div>
                  <div style={{fontSize:14,color:"#f1f5f9",fontWeight:600}}>{selected.length ? selected.join(", ") : "None selected"}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:12,color:"#94a3b8"}}>Estimated total</div>
                  <div style={{fontSize:24,color:"#22c55e",fontWeight:800}}>${total}/mo</div>
                </div>
              </div>

              <button
                onClick={requestChange}
                disabled={submitting || !changed}
                style={{...S.btn, opacity: (submitting || !changed) ? 0.5 : 1, cursor: (submitting || !changed) ? "default" : "pointer"}}
              >
                {submitting ? "Sending..." : !changed ? "No changes to request" : "Request This Change"}
              </button>

              <div style={S.infoBox}>
                <h3 style={{color:"#f1f5f9",marginBottom:12,fontSize:16}}>💡 How it works</h3>
                <p style={{color:"#475569",fontSize:13,lineHeight:1.7,margin:0}}>
                  Toggle the modules you want, then click "Request This Change". Our team reviews and activates it
                  manually — no automatic payment required. We'll follow up by email to confirm and arrange billing.
                </p>
              </div>
            </>
          )}

          <div style={{textAlign:"center",marginTop:24}}>
            <a href="/dashboard" style={{color:"#475569",fontSize:14,textDecoration:"none"}}>← Back to Dashboard</a>
          </div>
        </div>
      </div>
    </>
  );
}

const S = {
  page:{minHeight:"100vh",background:"#050810",padding:"60px 20px",position:"relative",overflow:"hidden"},
  glow1:{position:"absolute",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(59,130,246,0.08) 0%,transparent 70%)",top:-200,left:-200,pointerEvents:"none"},
  glow2:{position:"absolute",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,0.08) 0%,transparent 70%)",bottom:-100,right:0,pointerEvents:"none"},
  inner:{maxWidth:1100,margin:"0 auto",position:"relative",zIndex:1},
  title:{fontFamily:"Syne,sans-serif",fontSize:40,fontWeight:700,color:"#f1f5f9",marginBottom:12},
  sub:{color:"#475569",fontSize:15},
  grid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:20,marginBottom:24},
  card:{background:"#0d1326",borderRadius:20,padding:24,display:"flex",flexDirection:"column",gap:10},
  currentBadge:{position:"absolute",top:-10,left:16,padding:"3px 12px",borderRadius:999,fontSize:10,fontWeight:700,color:"#0b1220",background:"#22c55e"},
  planName:{fontSize:17,fontWeight:700,margin:0,color:"#f1f5f9"},
  price:{display:"flex",alignItems:"baseline",gap:3},
  dollar:{fontSize:16,color:"#94a3b8",fontWeight:600},
  amount:{fontSize:32,fontWeight:800,color:"#f1f5f9"},
  period:{fontSize:12,color:"#475569"},
  desc:{color:"#94a3b8",fontSize:12.5,lineHeight:1.5,margin:0},
  limitsRow:{display:"flex",flexWrap:"wrap",gap:6,marginTop:4},
  limitPill:{fontSize:10.5,color:"#64748b",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",padding:"3px 8px",borderRadius:8},
  summaryBar:{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#0d1326",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:"18px 24px",marginBottom:16},
  btn:{width:"100%",padding:"14px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#3b82f6,#6366f1)",color:"#fff",fontSize:15,fontWeight:600},
  infoBox:{background:"#0d1326",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:24,marginTop:24},
};
