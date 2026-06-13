import { useState } from "react";
const API_BASE = "https://backend.mob13r.com";
export default function Signup() {
  const [form, setForm] = useState({ company_name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) return setError("Passwords do not match");
    if (form.password.length < 6) return setError("Password min 6 characters");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/saas/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_name: form.company_name, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Signup failed"); setLoading(false); return; }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("org", JSON.stringify(data.org));
      localStorage.setItem("token_expiry", Date.now() + 24 * 60 * 60 * 1000);
      window.location.href = "/dashboard";
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
  input:{width:"100%",padding:"12px 16px",borderRadius:12,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.04)",color:"#f1f5f9",fontSize:14,outline:"none"},
  btn:{width:"100%",padding:"14px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#3b82f6,#6366f1)",color:"#fff",fontSize:15,fontWeight:600,cursor:"pointer",marginTop:8},
};
