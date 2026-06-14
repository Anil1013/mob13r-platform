import { NavLink, useNavigate } from "react-router-dom";
export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user")) || { email: "Admin" };
  const org = JSON.parse(localStorage.getItem("org")) || {};
  const isSuperAdmin = user.email === "admin@mob13r.com";
  const logout = () => {
    ["token","token_expiry","user","publisher_key","publisher_id","publisher_name","org"].forEach(k=>localStorage.removeItem(k));
    navigate("/login", { replace: true });
  };
  if (!token) { navigate("/login", { replace: true }); return null; }
  const links = [
    { to:"/dashboard", label:"Dashboard" },
    { to:"/advertisers", label:"Advertisers" },
    { to:"/offers", label:"Offers" },
    { to:"/publishers", label:"Publishers" },
    { to:"/publishers/assign", label:"Assign Offers" },
    { to:"/landing-builder", label:"Landing Builder" },
    { to:"/dashboard/dump", label:"Dump Logs" },
    { to:"/publisher/dashboard", label:"Pub Dashboard" },
    { to:"/plans", label:"📦 Plans" },
    ...(isSuperAdmin ? [{ to:"/super-admin", label:"⚙️ Super Admin" }] : []),
  ];
  return (
    <>
      <nav style={S.nav}>
        <div style={S.inner}>
          <div style={S.brand} onClick={()=>navigate("/dashboard")}>
            <span style={S.dot}/><span style={S.brandText}>mob13r</span>
          </div>
          <div style={S.links}>
            {links.map(l=>(
              <NavLink key={l.to} to={l.to} style={({isActive})=>({...S.link,...(isActive?S.active:{})})}>
                {l.label}
              </NavLink>
            ))}
          </div>
          <div style={S.right}>
            {org.name && <span style={S.orgBadge}>{org.name}</span>}
            <span style={S.email}>{user.email}</span>
            <button style={S.logout} onClick={logout}>Logout</button>
          </div>
        </div>
      </nav>
      <div style={{height:64}}/>
    </>
  );
}
const S = {
  nav:{ position:"fixed",top:0,left:0,right:0,height:64,zIndex:1000,background:"rgba(5,8,16,0.92)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,0.06)" },
  inner:{ height:"100%",maxWidth:1600,margin:"0 auto",padding:"0 24px",display:"flex",alignItems:"center",gap:8 },
  brand:{ display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginRight:24,userSelect:"none" },
  dot:{ width:8,height:8,borderRadius:"50%",background:"#3b82f6",boxShadow:"0 0 12px #3b82f6" },
  brandText:{ fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:18,color:"#f1f5f9",letterSpacing:"-0.5px" },
  links:{ display:"flex",alignItems:"center",gap:2,flex:1,overflowX:"auto" },
  link:{ padding:"6px 12px",borderRadius:8,fontSize:13,fontWeight:500,color:"#94a3b8",whiteSpace:"nowrap",textDecoration:"none" },
  active:{ color:"#f1f5f9",background:"rgba(59,130,246,0.12)" },
  right:{ display:"flex",alignItems:"center",gap:12,marginLeft:"auto" },
  orgBadge:{ fontSize:11,color:"#22c55e",background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.2)",padding:"3px 10px",borderRadius:20,whiteSpace:"nowrap" },
  email:{ fontSize:12,color:"#475569",whiteSpace:"nowrap" },
  logout:{ padding:"7px 16px",borderRadius:8,border:"1px solid rgba(239,68,68,0.3)",background:"rgba(239,68,68,0.08)",color:"#ef4444",cursor:"pointer",fontSize:13,fontWeight:500 },
};
