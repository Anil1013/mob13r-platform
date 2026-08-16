import { useEffect, useState } from "react";
const API_BASE = "https://backend.mob13r.com";

const MODULE_DESC = {
  CPA: { icon: "💰", desc: "Cost-per-action campaigns — advertiser payout, publisher payout, hold %." },
  CPI: { icon: "📲", desc: "Cost-per-install campaigns for app installs." },
  CPS: { icon: "🛒", desc: "Cost-per-sale campaigns for ecommerce/affiliate sales." },
  DCB: { icon: "📶", desc: "Direct carrier billing campaigns (CPA-suite version)." },
  MVAS: { icon: "📱", desc: "The full OTP/PIN-based mobile billing suite — Offers, Publishers, Assign Offers, Landing Builder, Carriers, Pin sessions and more." },
};

export default function Signup() {
  const [form, setForm] = useState({ company_name: "", email: "", password: "", confirm: "" });
  const [selected, setSelected] = useState([]);
  const [modulePlans, setModulePlans] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/saas/module-plans`)
      .then(r => r.json())
      .then(d => { if (d.success) setModulePlans(d.data); })
      .catch(() => {});
  }, []);

  const MODULES = modulePlans.length
    ? modulePlans.filter(p => p.tier === "basic").map(p => ({ code: p.code, label: p.name.replace(/ — Basic$/i, ""), price: Number(p.price_monthly), ...MODULE_DESC[p.code] }))
    : Object.keys(MODULE_DESC).map(code => ({ code, label: code, price: null, ...MODULE_DESC[code] }));

  const toggleModule = (code) => {
    setSelected(s => s.includes(code) ? s.filter(c => c !== code) : [...s, code]);
  };
  const selectAll = () => setSelected(MODULES.map(m => m.code));
  const allSelected = selected.length === MODULES.length;
  const totalPrice = MODULES.filter(m => selected.includes(m.code)).reduce((sum, m) => sum + (m.price || 0), 0);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) return setError("Passwords do not match");
    if (form.password.length < 6) return setError("Password min 6 characters");
    if (!selected.length) return setError("Select at least one vertical or In-app MVAS to continue");
    setLoading(true);
    try {
      const verticals = selected.filter(c => c !== "MVAS");
      const mvas = selected.includes("MVAS");
      const res = await fetch(`${API_BASE}/api/saas/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_name: form.company_name, email: form.email, password: form.password, verticals, mvas }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Signup failed"); setLoading(false); return; }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("org", JSON.stringify(data.org));
      localStorage.setItem("token_expiry", Date.now() + 24 * 60 * 60 * 1000);
      const org = data.org || {};
      window.location.href = (org.mvas_enabled === false && org.has_cpa_access) ? "/cpa/overview" : "/dashboard";
    } catch { setError("Server error"); setLoading(false); }
  };
  return (
    <div style={S.page}>
      <div style={S.glow1}/><div style={S.glow2}/>
      <div style={S.card}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={S.logo}>M</div>
        </div>
        <h1 style={S.title}>Create Account</h1>
        <p style={S.sub}>Start your free trial today</p>
        {error && <div style={S.error}>{error}</div>}
        <form onSubmit={handleSignup} style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={S.field}>
            <label style={S.label}>Company Name</label>
            <input style={S.input} placeholder="Acme Corp" value={form.company_name}
              onChange={e=>setForm({...form,company_name:e.target.value})} required/>
          </div>
          <div style={S.field}>
            <label style={S.label}>Email</label>
            <input type="email" style={S.input} placeholder="you@company.com" value={form.email}
              onChange={e=>setForm({...form,email:e.target.value})} required/>
          </div>

          <div style={S.field}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <label style={S.label}>Which do you want to use?</label>
              <span style={S.selectAllBtn} onClick={selectAll}>{allSelected ? "All selected ✓" : "Select all"}</span>
            </div>
            <div style={S.moduleGrid}>
              {MODULES.map(m => {
                const active = selected.includes(m.code);
                return (
                  <div key={m.code} style={{...S.moduleCard, ...(active ? S.moduleCardActive : {})}} onClick={() => toggleModule(m.code)}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:16}}>{m.icon}</span>
                      <span style={{fontWeight:700,fontSize:13,color: active ? "#f1f5f9" : "#cbd5e1"}}>{m.label}</span>
                      {m.price !== null && <span style={{marginLeft:"auto",fontSize:11,fontWeight:700,color: active ? "#22c55e" : "#64748b"}}>${m.price}/mo</span>}
                      {active && <span style={{marginLeft:6,color:"#22c55e",fontSize:14}}>✓</span>}
                    </div>
                    <p style={S.moduleDesc}>{m.desc}</p>
                  </div>
                );
              })}
            </div>
            {selected.length > 0 && (
              <div style={S.totalBar}>
                <span style={{color:"#94a3b8",fontSize:12}}>Estimated total</span>
                <span style={{color:"#22c55e",fontWeight:800,fontSize:16}}>${totalPrice}/mo</span>
              </div>
            )}
            <p style={{fontSize:11,color:"#475569",marginTop:2}}>You'll only see the modules you select — nothing else clutters your dashboard. Your 7-day free trial includes everything you pick, no card required.</p>
          </div>
          <div style={S.field}>
            <label style={S.label}>Password</label>
            <input type="password" style={S.input} placeholder="••••••••" value={form.password}
              onChange={e=>setForm({...form,password:e.target.value})} required/>
          </div>
          <div style={S.field}>
            <label style={S.label}>Confirm Password</label>
            <input type="password" style={S.input} placeholder="••••••••" value={form.confirm}
              onChange={e=>setForm({...form,confirm:e.target.value})} required/>
          </div>
          <button type="submit" style={{...S.btn,opacity:loading?0.7:1}} disabled={loading}>
            {loading?"Creating Account...":"Create Account"}
          </button>
        </form>
        <p style={{textAlign:"center",marginTop:20,color:"#475569",fontSize:13}}>
          Already have an account?{" "}
          <a href="/login" style={{color:"#3b82f6",textDecoration:"none"}}>Sign In</a>
        </p>
      </div>
    </div>
  );
}
const S = {
  page:{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#050810",position:"relative",overflow:"hidden"},
  glow1:{position:"absolute",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(59,130,246,0.12) 0%,transparent 70%)",top:-200,left:-200,pointerEvents:"none"},
  glow2:{position:"absolute",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,0.08) 0%,transparent 70%)",bottom:-100,right:-100,pointerEvents:"none"},
  card:{width:"100%",maxWidth:420,padding:"48px 40px",background:"#0d1326",borderRadius:24,border:"1px solid rgba(255,255,255,0.07)",boxShadow:"0 25px 60px rgba(0,0,0,0.5)",position:"relative",zIndex:1},
  logo:{width:60,height:60,borderRadius:16,background:"linear-gradient(135deg,#3b82f6,#6366f1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:800,color:"#fff",margin:"0 auto"},
  title:{fontFamily:"Syne,sans-serif",fontSize:26,fontWeight:700,color:"#f1f5f9",textAlign:"center",marginBottom:8},
  sub:{color:"#475569",textAlign:"center",marginBottom:24,fontSize:14},
  error:{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",padding:"10px 14px",borderRadius:10,marginBottom:16,fontSize:13},
  field:{display:"flex",flexDirection:"column",gap:8},
  label:{fontSize:12,fontWeight:600,color:"#94a3b8",letterSpacing:"0.05em",textTransform:"uppercase"},
  selectAllBtn:{fontSize:11,color:"#3b82f6",cursor:"pointer",fontWeight:600},
  moduleGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4},
  moduleCard:{padding:"10px 12px",borderRadius:12,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.02)",cursor:"pointer",transition:"all 0.15s"},
  moduleCardActive:{border:"1px solid rgba(34,197,94,0.4)",background:"rgba(34,197,94,0.06)"},
  moduleDesc:{fontSize:10.5,color:"#64748b",margin:"4px 0 0",lineHeight:1.4},
  totalBar:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderRadius:10,background:"rgba(34,197,94,0.06)",border:"1px solid rgba(34,197,94,0.2)",marginTop:8},
  input:{width:"100%",padding:"12px 16px",borderRadius:12,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.04)",color:"#f1f5f9",fontSize:14,outline:"none"},
  btn:{width:"100%",padding:"14px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#3b82f6,#6366f1)",color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",marginTop:8},
};
