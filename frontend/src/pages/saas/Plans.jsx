import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
const API_BASE = "https://backend.mob13r.com";

const ICONS = { CPA: "💰", CPI: "📲", CPS: "🛒", DCB: "📶", MVAS: "📱" };
const TIER_LABEL = { basic: "Basic", growth: "Growth", pro: "Pro" };
const ALL_CODES = ["CPA", "CPI", "CPS", "DCB", "MVAS"];

export default function Plans() {
  const [allPlans, setAllPlans] = useState([]); // every (code, tier) row
  const [active, setActive] = useState([]); // [{code, tier}] currently on
  // selection[code] = null (off) | "basic" | "growth" | "pro"
  const [selection, setSelection] = useState({});
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
      if (plansRes.success) setAllPlans(plansRes.data);
      if (myRes.success) {
        setActive(myRes.data.active);
        const sel = {};
        myRes.data.active.forEach(a => { sel[a.code] = a.tier; });
        setSelection(sel);
      }
    }).catch(() => showToast("Failed to load plans", "error"))
      .finally(() => setLoading(false));
  }, []);

  const tiersFor = (code) => allPlans.filter(p => p.code === code);
  const planFor = (code, tier) => allPlans.find(p => p.code === code && p.tier === tier);

  const setTier = (code, tier) => setSelection(s => ({ ...s, [code]: s[code] === tier ? null : tier }));

  const selectedList = Object.entries(selection).filter(([, tier]) => tier).map(([code, tier]) => ({ code, tier }));
  const total = selectedList.reduce((sum, s) => sum + Number(planFor(s.code, s.tier)?.price_monthly || 0), 0);
  const changed = JSON.stringify([...selectedList].sort((a, b) => a.code.localeCompare(b.code)))
    !== JSON.stringify([...active].sort((a, b) => a.code.localeCompare(b.code)));

  const requestChange = async () => {
    if (!selectedList.length) return showToast("Select at least one module", "error");
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/saas/plan-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ modules: selectedList }),
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
            <p style={S.sub}>Each module has Basic / Growth / Pro tiers — need more publishers or campaigns? Move that module up a tier.</p>
          </div>

          {loading ? (
            <p style={{textAlign:"center",color:"#475569"}}>Loading...</p>
          ) : (
            <>
              <div style={S.grid}>
                {ALL_CODES.map(code => {
                  const tiers = tiersFor(code);
                  if (!tiers.length) return null;
                  const isActiveModule = active.some(a => a.code === code);
                  const selectedTier = selection[code];
                  return (
                    <div key={code} style={{...S.card, border:`1px solid ${selectedTier ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.07)"}`, position:"relative"}}>
                      {isActiveModule && <div style={S.currentBadge}>Currently Active</div>}
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                        <span style={{fontSize:22}}>{ICONS[code] || "📦"}</span>
                        <h2 style={S.planName}>{code === "MVAS" ? "In-app" : code}</h2>
                      </div>

                      <div style={S.tierRow}>
                        {tiers.map(t => {
                          const isSel = selectedTier === t.tier;
                          return (
                            <div key={t.tier} onClick={() => setTier(code, t.tier)} style={{...S.tierPill, ...(isSel ? S.tierPillActive : {})}}>
                              <div style={{fontSize:11,fontWeight:700,color: isSel ? "#0b1220" : "#cbd5e1"}}>{TIER_LABEL[t.tier]}</div>
                              <div style={{fontSize:14,fontWeight:800,color: isSel ? "#0b1220" : "#f1f5f9"}}>${t.price_monthly}</div>
                            </div>
                          );
                        })}
                        <div onClick={() => setSelection(s => ({...s, [code]: null}))} style={{...S.tierPill, ...(!selectedTier ? S.tierPillOff : {})}}>
                          <div style={{fontSize:11,fontWeight:700,color: !selectedTier ? "#fff" : "#64748b"}}>Off</div>
                        </div>
                      </div>

                      {selectedTier && (
                        <>
                          <p style={S.desc}>{planFor(code, selectedTier)?.description}</p>
                          <div style={S.limitsRow}>
                            {planFor(code, selectedTier)?.max_campaigns != null && <span style={S.limitPill}>{planFor(code, selectedTier).max_campaigns} campaigns</span>}
                            {planFor(code, selectedTier)?.max_campaigns === null && tiers.some(t=>t.tier===selectedTier) && code!=="MVAS" && <span style={S.limitPill}>Unlimited campaigns</span>}
                            {planFor(code, selectedTier)?.max_publishers != null && <span style={S.limitPill}>{planFor(code, selectedTier).max_publishers} publishers</span>}
                            {planFor(code, selectedTier)?.max_publishers === null && <span style={S.limitPill}>Unlimited publishers</span>}
                            {planFor(code, selectedTier)?.max_offers != null && <span style={S.limitPill}>{planFor(code, selectedTier).max_offers} offers</span>}
                            {planFor(code, selectedTier)?.monthly_conversions != null && <span style={S.limitPill}>{planFor(code, selectedTier).monthly_conversions.toLocaleString()} conv/mo</span>}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={S.summaryBar}>
                <div>
                  <div style={{fontSize:12,color:"#94a3b8"}}>Selected modules</div>
                  <div style={{fontSize:14,color:"#f1f5f9",fontWeight:600}}>
                    {selectedList.length ? selectedList.map(s => `${s.code} (${TIER_LABEL[s.tier]})`).join(", ") : "None selected"}
                  </div>
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
                <h3 style={{color:"#f1f5f9",marginBottom:12,fontSize:16}}>💡 Need more publishers or campaigns?</h3>
                <p style={{color:"#475569",fontSize:13,lineHeight:1.7,margin:0}}>
                  Move that module from Basic to Growth (or Pro for unlimited) — the price updates automatically.
                  Click "Request This Change" and our team reviews & activates it manually, no automatic payment.
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
  title:{fontFamily:"Lora,serif",fontSize:40,fontWeight:700,color:"#f1f5f9",marginBottom:12},
  sub:{color:"#475569",fontSize:15,maxWidth:520,margin:"0 auto"},
  grid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:20,marginBottom:24},
  card:{background:"#0d1326",borderRadius:20,padding:22,display:"flex",flexDirection:"column",gap:8,position:"relative"},
  currentBadge:{position:"absolute",top:-10,left:16,padding:"3px 12px",borderRadius:999,fontSize:10,fontWeight:700,color:"#0b1220",background:"#22c55e"},
  planName:{fontSize:16,fontWeight:700,margin:0,color:"#f1f5f9"},
  tierRow:{display:"flex",gap:6},
  tierPill:{flex:1,padding:"8px 6px",borderRadius:10,textAlign:"center",cursor:"pointer",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)"},
  tierPillActive:{background:"#22c55e",border:"1px solid #22c55e"},
  tierPillOff:{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)"},
  desc:{color:"#94a3b8",fontSize:12,lineHeight:1.5,margin:"6px 0 0"},
  limitsRow:{display:"flex",flexWrap:"wrap",gap:6,marginTop:2},
  limitPill:{fontSize:10.5,color:"#64748b",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",padding:"3px 8px",borderRadius:8},
  summaryBar:{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#0d1326",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:"18px 24px",marginBottom:16},
  btn:{width:"100%",padding:"14px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#3b82f6,#6366f1)",color:"#fff",fontSize:15,fontWeight:600},
  infoBox:{background:"#0d1326",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:24,marginTop:24},
};
