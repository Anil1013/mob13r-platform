import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
const API_BASE = "https://backend.mob13r.com";
export default function SuperAdmin() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };
  useEffect(() => {
    if (user.email !== "admin@mob13r.com") { window.location.href = "/dashboard"; return; }
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
  const deleteOrg = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/saas/admin/orgs/${id}`, {
        method:"DELETE",
        headers:{ Authorization:`Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast("Organization deleted!");
        setDeleteConfirm(null);
        loadOrgs();
      } else {
        showToast(data.error || "Delete failed","error");
      }
    } catch { showToast("Delete failed","error"); }
  };
  return (
    <>
      <Navbar/>
      <div style={S.page}>
        {toast && <div style={{...S.toast, background:toast.type==="error"?"rgba(239,68,68,0.15)":"rgba(34,197,94,0.15)", color:toast.type==="error"?"#ef4444":"#22c55e", border:`1px solid ${toast.type==="error"?"rgba(239,68,68,0.3)":"rgba(34,197,94,0.3)"}`}}>{toast.msg}</div>}

        {/* DELETE CONFIRM MODAL */}
        {deleteConfirm && (
          <div style={S.modalOverlay}>
            <div style={S.modal}>
              <h3 style={{color:"#f1f5f9",marginBottom:8}}>⚠️ Delete Organization</h3>
              <p style={{color:"#94a3b8",fontSize:14,marginBottom:8}}>
                Are you sure you want to delete <strong style={{color:"#ef4444"}}>{deleteConfirm.name}</strong>?
              </p>
              <p style={{color:"#ef4444",fontSize:12,marginBottom:24}}>
                This will permanently delete the organization and ALL its data including advertisers, offers, publishers, and campaigns. This action CANNOT be undone!
              </p>
              <div style={{display:"flex",gap:12}}>
                <button onClick={() => deleteOrg(deleteConfirm.id)} style={S.deleteConfirmBtn}>
                  Yes, Delete Permanently
                </button>
                <button onClick={() => setDeleteConfirm(null)} style={S.cancelBtn}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={S.header}>
          <h1 style={S.title}>Super Admin Panel</h1>
          <p style={S.sub}>Manage all organizations — Only visible to admin@mob13r.com</p>
          <div style={S.statsRow}>
            <div style={S.statBox}>
              <div style={{fontSize:24,fontWeight:700,color:"#3b82f6"}}>{orgs.length}</div>
              <div style={{fontSize:12,color:"#475569"}}>Total Orgs</div>
            </div>
            <div style={S.statBox}>
              <div style={{fontSize:24,fontWeight:700,color:"#22c55e"}}>{orgs.filter(o=>o.status==="active").length}</div>
              <div style={{fontSize:12,color:"#475569"}}>Active</div>
            </div>
            <div style={S.statBox}>
              <div style={{fontSize:24,fontWeight:700,color:"#f59e0b"}}>{orgs.filter(o=>o.status==="pending").length}</div>
              <div style={{fontSize:12,color:"#475569"}}>Pending</div>
            </div>
            <div style={S.statBox}>
              <div style={{fontSize:24,fontWeight:700,color:"#ef4444"}}>{orgs.filter(o=>o.status==="suspended").length}</div>
              <div style={{fontSize:12,color:"#475569"}}>Suspended</div>
            </div>
          </div>
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
                <tr key={org.id} style={{opacity: org.status==="suspended"?0.6:1}}>
                  <td style={S.td}><span style={S.idBadge}>{org.id}</span></td>
                  <td style={S.td}>
                    <div style={{color:"#f1f5f9",fontWeight:500}}>{org.name}</div>
                    <div style={{color:"#475569",fontSize:11,marginTop:2}}>{org.slug}</div>
                  </td>
                  <td style={S.td}>
                    <select defaultValue={org.plan} onChange={e => updateOrg(org.id, { plan: e.target.value })} style={S.select}>
                      <option value="starter">Starter</option>
                      <option value="growth">Growth</option>
                      <option value="pro">Pro</option>
                    </select>
                  </td>
                  <td style={S.td}>
                    <select defaultValue={org.status} onChange={e => updateOrg(org.id, { status: e.target.value })}
                      style={{...S.select, color: org.status==="active"?"#22c55e":org.status==="pending"?"#f59e0b":"#ef4444"}}>
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </td>
                  <td style={S.td}>
                    <input type="number" defaultValue={org.max_publishers}
                      onBlur={e => updateOrg(org.id, { max_publishers: Number(e.target.value) })}
                      style={S.numInput}/>
                  </td>
                  <td style={S.td}>
                    <input type="number" defaultValue={org.max_offers}
                      onBlur={e => updateOrg(org.id, { max_offers: Number(e.target.value) })}
                      style={S.numInput}/>
                  </td>
                  <td style={S.td}>
                    <input type="number" defaultValue={org.monthly_conversions}
                      onBlur={e => updateOrg(org.id, { monthly_conversions: Number(e.target.value) })}
                      style={S.numInput}/>
                  </td>
                  <td style={S.td}>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      <button onClick={() => updateOrg(org.id, { status:"active", plan:"pro", max_publishers:999, max_offers:999, monthly_conversions:999999 })}
                        style={S.approveBtn}>✓ Free Approve</button>
                      {org.id !== 1 && (
                        <button onClick={() => setDeleteConfirm(org)} style={S.deleteBtn}>
                          🗑 Delete
                        </button>
                      )}
                    </div>
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
  sub:{color:"#475569",fontSize:13,marginTop:4,marginBottom:24},
  statsRow:{display:"flex",gap:16,marginBottom:8},
  statBox:{background:"#0d1326",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"16px 24px",textAlign:"center"},
  tableWrap:{background:"#0d1326",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,overflow:"auto"},
  table:{width:"100%",borderCollapse:"collapse"},
  th:{padding:"12px 16px",textAlign:"left",fontSize:11,fontWeight:600,color:"#475569",textTransform:"uppercase",letterSpacing:"0.08em",borderBottom:"1px solid rgba(255,255,255,0.07)",background:"#0a0f1e"},
  td:{padding:"14px 16px",borderBottom:"1px solid rgba(255,255,255,0.04)",color:"#94a3b8",fontSize:13},
  idBadge:{background:"rgba(59,130,246,0.1)",color:"#3b82f6",padding:"2px 8px",borderRadius:6,fontSize:12,fontWeight:600},
  select:{background:"#0a0f1e",border:"1px solid rgba(255,255,255,0.08)",color:"#f1f5f9",padding:"6px 10px",borderRadius:8,fontSize:12,cursor:"pointer"},
  numInput:{width:80,background:"#0a0f1e",border:"1px solid rgba(255,255,255,0.08)",color:"#f1f5f9",padding:"6px 10px",borderRadius:8,fontSize:12,textAlign:"center"},
  approveBtn:{background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.3)",color:"#22c55e",padding:"6px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600},
  deleteBtn:{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",color:"#ef4444",padding:"6px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600},
  modalOverlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"},
  modal:{background:"#0d1326",border:"1px solid rgba(239,68,68,0.3)",borderRadius:20,padding:32,maxWidth:440,width:"90%"},
  deleteConfirmBtn:{background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.4)",color:"#ef4444",padding:"10px 20px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600,flex:1},
  cancelBtn:{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#94a3b8",padding:"10px 20px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600},
};
