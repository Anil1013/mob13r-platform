import { useEffect, useState } from "react";
const API_BASE = "https://backend.mob13r.com";
const PLANS = [
  { id:"starter", name:"Starter", price:49, publishers:5, offers:15, conversions:"2,500", monthly_conversions:2500, max_publishers:5, max_offers:15, features:["5 Publishers","15 Offers","2.5K Conversions/mo","Basic Dashboard","Landing Builder"], color:"#3b82f6" },
  { id:"growth", name:"Growth", price:99, publishers:25, offers:50, conversions:"7,500", monthly_conversions:7500, max_publishers:25, max_offers:50, features:["25 Publishers","50 Offers","7.5K Conversions/mo","Advanced Analytics","Landing Builder","Priority Support"], color:"#8b5cf6", popular:true },
  { id:"pro", name:"Pro", price:199, publishers:"Unlimited", offers:"Unlimited", conversions:"30,000", monthly_conversions:30000, max_publishers:999, max_offers:999, features:["Unlimited Publishers","Unlimited Offers","30K Conversions/mo","All Features","Dedicated Support","Custom Integrations"], color:"#22c55e" },
];
export default function Plans() {
  const [currentPlan, setCurrentPlan] = useState("starter");
  const [orgStatus, setOrgStatus] = useState("active");
  const [requested, setRequested] = useState(null);
  const [toast, setToast] = useState(null);
  useEffect(() => {
    const org = JSON.parse(localStorage.getItem("org") || "{}");
    if (org.plan) setCurrentPlan(org.plan);
    if (org.status) setOrgStatus(org.status);
  }, []);
  const showToast = (msg, type="success") => {
    setToast({msg, type});
    setTimeout(() => setToast(null), 3000);
  };
  const handleRequest = async (plan) => {
    if (plan.id === currentPlan) return;
    setRequested(plan.id);
    try {
      const token = localStorage.getItem("token");
      const org = JSON.parse(localStorage.getItem("org") || "{}");
      await fetch(`${API_BASE}/api/saas/plan-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: plan.id, org_id: org.id, org_name: org.name }),
      });
      showToast(`Plan upgrade request sent! Admin will approve shortly.`);
    } catch {
      showToast("Request sent! Admin will contact you soon.");
    }
  };
  return (
    <div style={S.page}>
      <div style={S.glow1}/><div style={S.glow2}/>
      {toast && (
        <div style={{position:"fixed",top:24,right:24,zIndex:9999,background:toast.type==="error"?"rgba(239,68,68,0.15)":"rgba(34,197,94,0.15)",border:`1px solid ${toast.type==="error"?"rgba(239,68,68,0.3)":"rgba(34,197,94,0.3)"}`,color:toast.type==="error"?"#ef4444":"#22c55e",padding:"12px 20px",borderRadius:12,fontSize:13,fontWeight:500}}>
          {toast.msg}
        </div>
      )}
      <div style={S.inner}>
        <div style={{textAlign:"center",marginBottom:48}}>
          <h1 style={S.title}>Choose Your Plan</h1>
          <p style={S.sub}>Scale your affiliate marketing platform</p>
          {orgStatus === "pending" && (
            <div style={S.pendingBanner}>
              ⏳ Your account is pending approval. Admin will activate it shortly.
            </div>
          )}
        </div>
        <div style={S.grid}>
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const isRequested = requested === plan.id;
            return (
              <div key={plan.name} style={{...S.card, border:`1px solid ${plan.popular?"rgba(139,92,246,0.4)":"rgba(255,255,255,0.07)"}`, position:"relative"}}>
                {plan.popular && <div style={{...S.badge, background:plan.color}}>Most Popular</div>}
                <div style={{...S.planIcon, background:`${plan.color}20`, color:plan.color}}>{plan.name[0]}</div>
                <h2 style={{...S.planName, color:plan.color}}>{plan.name}</h2>
                <div style={S.price}>
                  <span style={S.dollar}>$</span>
                  <span style={S.amount}>{plan.price}</span>
                  <span style={S.period}>/mo</span>
                </div>
                <div style={S.divider}/>
                <ul style={S.features}>
                  {plan.features.map(f => (
                    <li key={f} style={S.feature}>
                      <span style={{color:plan.color}}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleRequest(plan)}
                  disabled={isCurrent || isRequested}
                  style={{
                    ...S.btn,
                    background: isCurrent ? `${plan.color}20` : isRequested ? "rgba(255,255,255,0.05)" : plan.color,
                    color: isCurrent ? plan.color : isRequested ? "#475569" : "#fff",
                    border: isCurrent ? `1px solid ${plan.color}` : "none",
                    cursor: isCurrent || isRequested ? "default" : "pointer",
                    opacity: isRequested ? 0.7 : 1,
                  }}
                >
                  {isCurrent ? "✓ Current Plan" : isRequested ? "⏳ Request Sent" : "Request Upgrade"}
                </button>
              </div>
            );
          })}
        </div>
        <div style={S.infoBox}>
          <h3 style={{color:"#f1f5f9",marginBottom:12,fontSize:16}}>💡 How it works</h3>
          <p style={{color:"#475569",fontSize:13,lineHeight:1.7,margin:0}}>
            Click "Request Upgrade" on any plan. Our team will review and activate your plan manually —
            no automatic payment required. We'll contact you via email to confirm.
          </p>
        </div>
        <div style={{textAlign:"center",marginTop:24}}>
          <a href="/dashboard" style={{color:"#475569",fontSize:14,textDecoration:"none"}}>← Back to Dashboard</a>
        </div>
      </div>
    </div>
  );
}
const S = {
  page:{minHeight:"100vh",background:"#050810",padding:"60px 20px",position:"relative",overflow:"hidden"},
  glow1:{position:"absolute",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(59,130,246,0.08) 0%,transparent 70%)",top:-200,left:-200,pointerEvents:"none"},
  glow2:{position:"absolute",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(139,92,246,0.08) 0%,transparent 70%)",bottom:-100,right:0,pointerEvents:"none"},
  inner:{maxWidth:1100,margin:"0 auto",position:"relative",zIndex:1},
  title:{fontFamily:"Syne,sans-serif",fontSize:40,fontWeight:700,color:"#f1f5f9",marginBottom:12},
  sub:{color:"#475569",fontSize:16},
  pendingBanner:{background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)",color:"#f59e0b",padding:"12px 20px",borderRadius:12,fontSize:13,fontWeight:500,marginTop:16,display:"inline-block"},
  grid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:24},
  card:{background:"#0d1326",borderRadius:24,padding:32,display:"flex",flexDirection:"column",gap:16},
  badge:{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",padding:"4px 16px",borderRadius:999,fontSize:12,fontWeight:700,color:"#fff",whiteSpace:"nowrap"},
  planIcon:{width:48,height:48,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800},
  planName:{fontSize:22,fontWeight:700,margin:0},
  price:{display:"flex",alignItems:"baseline",gap:4},
  dollar:{fontSize:20,color:"#94a3b8",fontWeight:600},
  amount:{fontSize:48,fontWeight:800,color:"#f1f5f9"},
  period:{fontSize:14,color:"#475569"},
  divider:{height:1,background:"rgba(255,255,255,0.06)"},
  features:{listStyle:"none",padding:0,margin:0,display:"flex",flexDirection:"column",gap:10,flex:1},
  feature:{color:"#94a3b8",fontSize:14,display:"flex",gap:8,alignItems:"center"},
  btn:{width:"100%",padding:"14px",borderRadius:12,fontSize:15,fontWeight:600,marginTop:8},
  infoBox:{background:"#0d1326",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:24,marginTop:32},
};
