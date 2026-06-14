import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
const API_BASE = "https://backend.mob13r.com";
export default function SuperAdmin() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };
  useEffect(() => {
    if (user.email !== "admin@mob13r.com") {
      window.location.href = "/dashboard";
      return;
    }
    loadOrgs();
  }, []);
  const loadOrgs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/saas/admin/orgs`, { headers:{ Authorization:`Bearer ${token}` }});
      const data = await res.json();
      setOrgs(data.data || []);
    } catch { showToast("Failed to load","error"); }
    setLoading(false);
  };
  const updateOrg = async (id, payload) => {
    try {
      await fetch(`${API_BASE}/api/saas/admin/orgs/${id}`, {
        method:"PATCH",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      showToast("Updated!");
      loadOrgs();
    } catch { showToast("Failed","error"); }
  };
  return (
    <>
      <Navbar/>
      <div style={S.page}>
        {toast && <div style={{...S.toast, background:toast.type==="error"?"rgba(239,68,68,0.15)":"rgba(34,197,94,0.15)", color:toast.type==="error"?"#ef4444":"#22c55e", border:`1px solid ${toast.type==="error"?"rgba(239,68,68,0.3)":"rgba(34,197,94,0.3)"}`}}>{toast.msg}</div>}
        <div style={S.header}>
          <h1 style={S.title}>Super Admin Panel</h1>
          <p style={S.sub}>Manage all organizations — Only visible to admin@mob13r.com</p>
        </div>
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                {["ID","Org Name","Plan","Status","Publishers","Offers","Conversions/mo","Actions"].map(h=>(
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{...S.td,textAlign:"center",padding:40,color:"#475569"}}>Loading...</td></tr>
              ) : orgs.map(org => (
                <tr key={org.id}>
                  <td style={S.td}><span style={S.idBadge}>{org.id}</span></td>
                  <td style={{...S.td,color:"#f1f5f9",fontWeight:500}}>{org.name}</td>
                  <td style={S.td}>
                    <select defaultValue={org.plan} onChange={e => updateOrg(org.id, { plan: e.target.value })} style={S.select}>
                      <option value="starter">Starter</option>
                      <option value="growth">Growth</option>
                      <option value="pro">Pro</option>
                    </select>
                  </td>
                  <td style={S.td}>
                    <select defaultValue={org.status} onChange={e => updateOrg(org.id, { status: e.target.value })} style={{...S.select, color: org.status==="active"?"#22c55e":org.status==="pending"?"#f59e0b":"#ef4444"}}>
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </td>
                  <td style={S.td}><input type="number" defaultValue={org.max_publishers} onBlur={e => updateOrg(org.id, { max_publishers: Number(e.target.value) })} style={S.numInput}/></td>
                  <td style={S.td}><input type="number" defaultValue={org.max_offers} onBlur={e => updateOrg(org.id, { max_offers: Number(e.target.value) })} style={S.numInput}/></td>
                  <td style={S.td}><input type="number" defaultValue={org.monthly_conversions} onBlur={e => updateOrg(org.id, { monthly_conversions: Number(e.target.value) })} style={S.numInput}/></td>
                  <td style={S.td}>
                    <button onClick={() => updateOrg(org.id, { status:"active", plan:"pro", max_publishers:999, max_offers:999, monthly_conversions:999999 })} style={S.approveBtn}>✓ Free Approve</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
const S = {
  page:{minHeight:"100vh",background:"#050810",padding:"32px 24px"},
  toast:{position:"fixed",top:80,right:24,zIndex:9999,padding:"12px 20px",borderRadius:12,fontSize:13,fontWeight:500},
  header:{marginBottom:32},
  title:{fontFamily:"Syne,sans-serif",fontSize:28,fontWeight:700,color:"#f1f5f9"},
  sub:{color:"#475569",fontSize:13,marginTop:4},
  tableWrap:{background:"#0d1326",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,overflow:"auto"},
  table:{width:"100%",borderCollapse:"collapse"},
  th:{padding:"12px 16px",textAlign:"left",fontSize:11,fontWeight:600,color:"#475569",textTransform:"uppercase",letterSpacing:"0.08em",borderBottom:"1px solid rgba(255,255,255,0.07)",background:"#0a0f1e"},
  td:{padding:"14px 16px",borderBottom:"1px solid rgba(255,255,255,0.04)",color:"#94a3b8",fontSize:13},
  idBadge:{background:"rgba(59,130,246,0.1)",color:"#3b82f6",padding:"2px 8px",borderRadius:6,fontSize:12,fontWeight:600},
  select:{background:"#0a0f1e",border:"1px solid rgba(255,255,255,0.08)",color:"#f1f5f9",padding:"6px 10px",borderRadius:8,fontSize:12,cursor:"pointer"},
  numInput:{width:80,background:"#0a0f1e",border:"1px solid rgba(255,255,255,0.08)",color:"#f1f5f9",padding:"6px 10px",borderRadius:8,fontSize:12,textAlign:"center"},
  approveBtn:{background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.3)",color:"#22c55e",padding:"6px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600},
};
