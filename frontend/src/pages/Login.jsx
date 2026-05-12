import { useState } from "react";
const API_BASE = "https://backend.mob13r.com";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({email,password}),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message||"Login failed"); setLoading(false); return; }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("token_expiry", Date.now()+24*60*60*1000);
      window.location.href="/dashboard";
    } catch { setError("Server error"); setLoading(false); }
  };

  return (
    <div style={S.page}>
      <div style={S.glow1}/><div style={S.glow2}/>
      <div style={S.card}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <img src="/logo.png" alt="Mob13r" style={S.logo}/>
        </div>
        <h1 style={S.title}>Welcome back</h1>
        <p style={S.sub}>Sign in to your dashboard</p>
        {error&&<div style={S.error}>{error}</div>}
        <form onSubmit={handleLogin} style={{display:"flex",flexDirection:"column",gap:20}}>
          <div style={S.field}>
            <label style={S.label}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              required placeholder="admin@mob13r.com" style={S.input}/>
          </div>
          <div style={S.field}>
            <label style={S.label}>Password</label>
            <div style={{position:"relative"}}>
              <input type={show?"text":"password"} value={password}
                onChange={e=>setPassword(e.target.value)} required
                placeholder="••••••••" style={S.input}/>
              <span onClick={()=>setShow(!show)} style={S.eye}>{show?"🙈":"👁️"}</span>
            </div>
          </div>
          <button type="submit" style={{...S.btn,opacity:loading?0.7:1}} disabled={loading}>
            {loading?"Signing in...":"Sign In →"}
          </button>
        </form>
      </div>
    </div>
  );
}

const S = {
  page: { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#050810", position:"relative", overflow:"hidden" },
  glow1: { position:"absolute", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(59,130,246,0.12) 0%,transparent 70%)", top:-200, left:-200, pointerEvents:"none" },
  glow2: { position:"absolute", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,0.08) 0%,transparent 70%)", bottom:-100, right:-100, pointerEvents:"none" },
  card: { width:"100%", maxWidth:400, padding:"48px 40px", background:"#0d1326", borderRadius:24, border:"1px solid rgba(255,255,255,0.07)", boxShadow:"0 25px 60px rgba(0,0,0,0.5)", position:"relative", zIndex:1 },
  logo: { width:80, height:80, borderRadius:20, objectFit:"cover" },
  title: { fontFamily:"Syne,sans-serif", fontSize:28, fontWeight:700, color:"#f1f5f9", textAlign:"center", marginBottom:8 },
  sub: { color:"#475569", textAlign:"center", marginBottom:32, fontSize:14 },
  error: { background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", color:"#ef4444", padding:"10px 14px", borderRadius:10, marginBottom:20, fontSize:13 },
  field: { display:"flex", flexDirection:"column", gap:8 },
  label: { fontSize:12, fontWeight:600, color:"#94a3b8", letterSpacing:"0.05em", textTransform:"uppercase" },
  input: { width:"100%", padding:"12px 16px", borderRadius:12, border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.04)", color:"#f1f5f9", fontSize:14, outline:"none" },
  eye: { position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", cursor:"pointer", fontSize:16 },
  btn: { width:"100%", padding:"14px", borderRadius:12, border:"none", background:"linear-gradient(135deg,#3b82f6,#6366f1)", color:"#fff", fontSize:15, fontWeight:600, cursor:"pointer", boxShadow:"0 4px 20px rgba(59,130,246,0.3)", marginTop:8 },
};
