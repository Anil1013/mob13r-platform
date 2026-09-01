import { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
const API_BASE = "https://backend.mob13r.com";
export default function SuperAdmin() {
  const [orgs, setOrgs] = useState([]);
  const [planRequests, setPlanRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetUserId, setResetUserId] = useState(null);
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const MODULE_COLORS = {
    CPA: { bg:"#eff6ff", color:"#2563eb" },
    CPI: { bg:"#f0fdf4", color:"#16a34a" },
    CPS: { bg:"#fff7ed", color:"#c2650a" },
    DCB: { bg:"#fdf2f8", color:"#c026a3" },
    MVAS: { bg:"#f3ebfa", color:"#7c3aed" },
  };
  const moduleColor = (code) => MODULE_COLORS[code] || { bg:"#f8fafc", color:"#334155" };

  useEffect(() => {
    if (user.email !== "admin@mob13r.com") { window.location.href = "/dashboard"; return; }
    loadOrgs();
    loadPlanRequests();
  }, []);

  const loadPlanRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/saas/admin/plan-requests`, { headers:{ Authorization:`Bearer ${token}` }});
      const data = await res.json();
      setPlanRequests(data.data || []);
    } catch { /* non-blocking */ }
  };

  const approveRequest = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/saas/admin/plan-requests/${id}/approve`, { method:"POST", headers:{ Authorization:`Bearer ${token}` }});
      const data = await res.json();
      if (data.success) { showToast("Request approved and applied!"); loadPlanRequests(); loadOrgs(); }
      else showToast(data.error || "Failed to approve", "error");
    } catch { showToast("Failed to approve", "error"); }
  };

  const rejectRequest = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/saas/admin/plan-requests/${id}/reject`, { method:"POST", headers:{ Authorization:`Bearer ${token}` }});
      const data = await res.json();
      if (data.success) { showToast("Request rejected"); loadPlanRequests(); }
      else showToast(data.error || "Failed to reject", "error");
    } catch { showToast("Failed to reject", "error"); }
  };

  const loadOrgs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/saas/admin/orgs`, { headers:{ Authorization:`Bearer ${token}` }});
      const data = await res.json();
      setOrgs(data.data || []);
    } catch { showToast("Failed to load","error"); }
    setLoading(false);
  };

  // Number = signup order (oldest org = 1, i.e. the Default Org), independent
  // of how the table itself is sorted/displayed (newest-first). New orgs get
  // the next number up as they sign up — since the table lists newest first,
  // numbers appear in decreasing order top-to-bottom, with the Default Org's
  // "1" always at the very bottom.
  const rankById = useMemo(() => {
    const byCreated = [...orgs].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const map = {};
    byCreated.forEach((o, i) => { map[o.id] = i + 1; });
    return map;
  }, [orgs]);

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
        method:"DELETE", headers:{ Authorization:`Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) { showToast("Deleted!"); setDeleteConfirm(null); loadOrgs(); }
      else showToast(data.error || "Delete failed","error");
    } catch { showToast("Delete failed","error"); }
  };

  const resetPassword = async (userId) => {
    if (!newPassword || newPassword.length < 6) { showToast("Min 6 characters","error"); return; }
    try {
      const res = await fetch(`${API_BASE}/api/saas/admin/users/${userId}/reset-password`, {
        method:"PATCH",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body: JSON.stringify({ new_password: newPassword })
      });
      const data = await res.json();
      if (data.success) { showToast("Password reset successfully!"); setResetUserId(null); setNewPassword(""); }
      else showToast(data.error || "Reset failed","error");
    } catch { showToast("Reset failed","error"); }
  };

  return (
    <>
      <Navbar/>
      <div style={S.page} className="m13-fade-in">
        {toast && <div style={{...S.toast, background:toast.type==="error"?"rgba(239,68,68,0.15)":"rgba(34,197,94,0.15)", color:toast.type==="error"?"#ef4444":"#22c55e", border:`1px solid ${toast.type==="error"?"rgba(239,68,68,0.3)":"rgba(34,197,94,0.3)"}`}}>{toast.msg}</div>}

        {/* DELETE MODAL */}
        {deleteConfirm && (
          <div style={S.modalOverlay}>
            <div style={S.modal}>
              <h3 style={{color:"#2d1b30",marginBottom:8}}>⚠️ Delete Organization</h3>
              <p style={{color:"#8b6a9a",fontSize:14,marginBottom:8}}>Delete <strong style={{color:"#ef4444"}}>{deleteConfirm.name}</strong>?</p>
              <p style={{color:"#ef4444",fontSize:12,marginBottom:24}}>This will permanently delete ALL data. Cannot be undone!</p>
              <div style={{display:"flex",gap:12}}>
                <button onClick={() => deleteOrg(deleteConfirm.id)} style={S.deleteConfirmBtn}>Yes, Delete</button>
                <button onClick={() => setDeleteConfirm(null)} style={S.cancelBtn}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* CLIENT DETAILS MODAL */}
        {selectedOrg && (
          <div style={S.modalOverlay}>
            <div style={{...S.modal, maxWidth:600, width:"95%"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <h3 style={{color:"#2d1b30",margin:0}}>📋 {selectedOrg.name} — Details</h3>
                <button onClick={() => setSelectedOrg(null)} style={{background:"none",border:"none",color:"#8b6a9a",cursor:"pointer",fontSize:20}}>✕</button>
              </div>

              {/* Stats */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
                {[
                  { label:"Advertisers", value: selectedOrg.total_advertisers || 0, color:"#3b82f6" },
                  { label:"Publishers", value: selectedOrg.total_publishers || 0, color:"#8b5cf6" },
                  { label:"Offers", value: selectedOrg.total_offers || 0, color:"#f59e0b" },
                  { label:"Conversions", value: selectedOrg.total_conversions || 0, color:"#22c55e" },
                ].map(s => (
                  <div key={s.label} style={{background:"#faf6fb",borderRadius:12,padding:"12px",textAlign:"center"}}>
                    <div style={{fontSize:22,fontWeight:700,color:s.color}}>{s.value}</div>
                    <div style={{fontSize:11,color:"#a888b3"}}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Users / Credentials */}
              <div style={{marginBottom:16}}>
                <h4 style={{color:"#2d1b30",marginBottom:12,fontSize:14}}>👤 Login Credentials</h4>
                {(selectedOrg.users || []).filter(u => u.id).map(u => (
                  <div key={u.id} style={{background:"#faf6fb",borderRadius:12,padding:16,marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                      <div>
                        <div style={{color:"#2d1b30",fontWeight:600,fontSize:14}}>{u.email}</div>
                        <div style={{color:"#a888b3",fontSize:12,marginTop:4}}>
                          Role: <span style={{color:"#3b82f6"}}>{u.role}</span> |
                          Status: <span style={{color: u.status==="active"?"#22c55e":"#ef4444"}}>{u.status}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => { setResetUserId(u.id); setNewPassword(""); }}
                        style={{background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)",color:"#f59e0b",padding:"6px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600}}
                      >
                        🔑 Reset Password
                      </button>
                    </div>

                    {/* Password Reset Form */}
                    {resetUserId === u.id && (
                      <div style={{marginTop:12,display:"flex",gap:8,alignItems:"center"}}>
                        <input
                          type="text"
                          placeholder="New password (min 6 chars)"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          style={{flex:1,padding:"8px 12px",borderRadius:8,border:"1px solid #ecdde6",background:"#f8fafc",color:"#2d1b30",fontSize:13}}
                        />
                        <button onClick={() => resetPassword(u.id)} style={{background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.3)",color:"#22c55e",padding:"8px 16px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600}}>Save</button>
                        <button onClick={() => setResetUserId(null)} style={{background:"none",border:"1px solid #ecdde6",color:"#a888b3",padding:"8px 12px",borderRadius:8,cursor:"pointer",fontSize:12}}>Cancel</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Org Info */}
              <div style={{background:"#faf6fb",borderRadius:12,padding:16}}>
                <h4 style={{color:"#2d1b30",marginBottom:12,fontSize:14}}>🏢 Organization Info</h4>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:13}}>
                  <div style={{color:"#a888b3"}}>Plan: <span style={{color:"#2d1b30"}}>{selectedOrg.plan}</span></div>
                  <div style={{color:"#a888b3"}}>Status: <span style={{color: selectedOrg.status==="active"?"#22c55e":"#ef4444"}}>{selectedOrg.status}</span></div>
                  <div style={{color:"#a888b3"}}>Max Publishers: <span style={{color:"#2d1b30"}}>{selectedOrg.max_publishers}</span></div>
                  <div style={{color:"#a888b3"}}>Max Offers: <span style={{color:"#2d1b30"}}>{selectedOrg.max_offers}</span></div>
                  <div style={{color:"#a888b3"}}>Conversions/mo: <span style={{color:"#2d1b30"}}>{selectedOrg.monthly_conversions}</span></div>
                  <div style={{color:"#a888b3"}}>Created: <span style={{color:"#2d1b30"}}>{new Date(selectedOrg.created_at).toLocaleDateString()}</span></div>
                  {selectedOrg.plan === "starter" && selectedOrg.trial_ends_at && (
                    <div style={{color:"#a888b3"}}>
                      Trial: {(() => {
                        const daysLeft = Math.ceil((new Date(selectedOrg.trial_ends_at) - new Date()) / (1000*60*60*24));
                        return daysLeft > 0
                          ? <span style={{color:"#22c55e"}}>{daysLeft} days left</span>
                          : <span style={{color:"#ef4444"}}>Expired</span>;
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PENDING PLAN REQUESTS */}
        {planRequests.length > 0 && (
          <div style={{background:"#ffffff", border:"1px solid rgba(245,158,11,0.3)", borderRadius:16, padding:20, marginBottom:24}}>
            <h3 style={{color:"#f59e0b", marginBottom:14, fontSize:15}}>⏳ Pending Plan Requests ({planRequests.length})</h3>
            <div style={{display:"flex", flexDirection:"column", gap:10}}>
              {planRequests.map(pr => (
                <div key={pr.id} style={{display:"flex", justifyContent:"space-between", alignItems:"center", background:"#faf6fb", borderRadius:12, padding:"12px 16px", flexWrap:"wrap", gap:10}}>
                  <div>
                    <div style={{color:"#2d1b30", fontWeight:600, fontSize:13}}>{pr.org_name} <span style={{color:"#a888b3", fontWeight:400}}>({pr.requested_by || "unknown"})</span></div>
                    <div style={{color:"#8b6a9a", fontSize:12, marginTop:2}}>
                      Requesting: {(pr.requested_modules_tiered || pr.requested_modules.map(c => ({code:c,tier:"basic"}))).map(m => `${m.code} (${m.tier})`).join(", ")}
                      {" · "}<span style={{color:"#22c55e", fontWeight:600}}>${pr.total_price}/mo</span>
                    </div>
                  </div>
                  <div style={{display:"flex", gap:8}}>
                    <button className="m13-btn" onClick={() => approveRequest(pr.id)} style={S.approveBtn}>✓ Approve & Apply</button>
                    <button className="m13-btn" onClick={() => rejectRequest(pr.id)} style={S.deleteBtn}>✕ Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HEADER */}
        <div style={S.header}>
          <h1 style={S.title}>⚙️ Super Admin Panel</h1>
          <div style={S.titleAccent} />
          <p style={S.sub}>Manage all organizations — Only visible to admin@mob13r.com</p>
          <div style={S.statsRow}>
            <div className="m13-card-hover" style={{...S.statBox, borderLeft:"4px solid #3b82f6"}}>
              <div style={{fontSize:22}}>🏢</div>
              <div style={{fontSize:24,fontWeight:800,color:"#3b82f6",fontFamily:"'Lora',serif"}}>{orgs.length}</div>
              <div style={{fontSize:11,color:"#a888b3",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>Total Orgs</div>
            </div>
            <div className="m13-card-hover" style={{...S.statBox, borderLeft:"4px solid #22c55e"}}>
              <div style={{fontSize:22}}>✅</div>
              <div style={{fontSize:24,fontWeight:800,color:"#22c55e",fontFamily:"'Lora',serif"}}>{orgs.filter(o=>o.status==="active").length}</div>
              <div style={{fontSize:11,color:"#a888b3",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>Active</div>
            </div>
            <div className="m13-card-hover" style={{...S.statBox, borderLeft:"4px solid #f59e0b"}}>
              <div style={{fontSize:22}}>⏳</div>
              <div style={{fontSize:24,fontWeight:800,color:"#f59e0b",fontFamily:"'Lora',serif"}}>{orgs.filter(o=>o.status==="pending").length}</div>
              <div style={{fontSize:11,color:"#a888b3",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>Pending</div>
            </div>
            <div className="m13-card-hover" style={{...S.statBox, borderLeft:"4px solid #ef4444"}}>
              <div style={{fontSize:22}}>⛔</div>
              <div style={{fontSize:24,fontWeight:800,color:"#ef4444",fontFamily:"'Lora',serif"}}>{orgs.filter(o=>o.status==="suspended").length}</div>
              <div style={{fontSize:11,color:"#a888b3",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>Suspended</div>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>{["ID","Org Name","Email","Modules","Plan","Trial","Status","Publishers","Offers","Conversions/mo","Total Sessions","Actions"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="11" style={{...S.td,textAlign:"center",padding:40}}>
                  <span className="m13-spinner" />
                  <div style={{marginTop:8, color:"#a888b3"}}>Loading organizations...</div>
                </td></tr>
              ) : orgs.map((org, idx) => {
                const primaryUser = (org.users || []).find(u => u.id) || {};
                return (
                  <tr key={org.id} className="m13-row-hover" style={{opacity: org.status==="suspended"?0.6:1, background: idx % 2 === 0 ? "#fff" : "#fdfafc"}}>
                    <td style={S.td}><span style={S.idBadge} title={`Database ID: ${org.id}`}>{rankById[org.id]}</span></td>
                    <td style={S.td}>
                      <div style={{color:"#2d1b30",fontWeight:500}}>{org.name}</div>
                      <div style={{color:"#a888b3",fontSize:11}}>{org.slug}</div>
                    </td>
                    <td style={S.td}>
                      <div style={{color:"#8b6a9a",fontSize:13}}>{primaryUser.email || "-"}</div>
                    </td>
                    <td style={S.td}>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4,maxWidth:160}}>
                        {(org.active_verticals || []).map(v => (
                          <span key={v.code} style={{...S.moduleBadge, background:moduleColor(v.code).bg, color:moduleColor(v.code).color, border:`1px solid ${moduleColor(v.code).color}22`}}>{v.code}·{v.tier}</span>
                        ))}
                        {org.mvas_enabled !== false && <span style={{...S.moduleBadge, background:moduleColor("MVAS").bg, color:moduleColor("MVAS").color, border:`1px solid ${moduleColor("MVAS").color}22`}}>MVAS·{org.mvas_tier || "basic"}</span>}
                        {!(org.active_verticals || []).length && org.mvas_enabled === false && <span style={{color:"#ef4444",fontSize:11}}>None</span>}
                      </div>
                    </td>
                    <td style={S.td}>
                      <select defaultValue={org.plan} onChange={e => updateOrg(org.id, { plan: e.target.value })} style={S.select}>
                        <option value="starter">Starter</option>
                        <option value="growth">Growth</option>
                        <option value="pro">Pro</option>
                      </select>
                    </td>
                    <td style={S.td}>
                      {org.plan === "starter" && org.trial_ends_at ? (
                        (() => {
                          const daysLeft = Math.ceil((new Date(org.trial_ends_at) - new Date()) / (1000*60*60*24));
                          return daysLeft > 0
                            ? <span style={{color:"#22c55e",fontSize:12,fontWeight:600}}>🟢 {daysLeft}d left</span>
                            : <span style={{color:"#ef4444",fontSize:12,fontWeight:600}}>🔴 Expired</span>;
                        })()
                      ) : (
                        <span style={{color:"#a888b3",fontSize:12}}>—</span>
                      )}
                    </td>
                    <td style={S.td}>
                      <select defaultValue={org.status} onChange={e => updateOrg(org.id, { status: e.target.value })}
                        style={{...S.select, color: org.status==="active"?"#22c55e":org.status==="pending"?"#f59e0b":"#ef4444"}}>
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </td>
                    <td style={S.td}><input type="number" defaultValue={org.max_publishers} onBlur={e => updateOrg(org.id, { max_publishers: Number(e.target.value) })} style={S.numInput}/></td>
                    <td style={S.td}><input type="number" defaultValue={org.max_offers} onBlur={e => updateOrg(org.id, { max_offers: Number(e.target.value) })} style={S.numInput}/></td>
                    <td style={S.td}><input type="number" defaultValue={org.monthly_conversions} onBlur={e => updateOrg(org.id, { monthly_conversions: Number(e.target.value) })} style={S.numInput}/></td>
                    <td style={S.td}><span style={{color:"#2d1b30",fontWeight:600}}>{org.total_sessions || 0}</span></td>
                    <td style={S.td}>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        <button className="m13-btn" onClick={() => setSelectedOrg(org)} style={S.viewBtn}>👁 View</button>
                        <button className="m13-btn" onClick={() => updateOrg(org.id, { status:"active", plan:"pro", max_publishers:999, max_offers:999, monthly_conversions:999999 })} style={S.approveBtn}>✓ Approve</button>
                        {org.id !== 1 && <button className="m13-btn" onClick={() => setDeleteConfirm(org)} style={S.deleteBtn}>🗑</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
const S = {
  page:{minHeight:"100vh",background:"linear-gradient(180deg,#fdf8fb 0%,#fbf3f7 100%)",padding:"32px 28px",maxWidth:1600,margin:"0 auto",fontFamily:"'Lora',serif"},
  toast:{position:"fixed",top:80,right:24,zIndex:9999,padding:"12px 20px",borderRadius:12,fontSize:13,fontWeight:500,fontFamily:"'Lora',serif"},
  header:{marginBottom:28},
  title:{fontFamily:"'Lora',serif",fontSize:26,fontWeight:800,color:"#2d1b30",letterSpacing:"-0.01em"},
  titleAccent:{width:70,height:4,borderRadius:4,background:"linear-gradient(135deg,#7c3aed,#d4709a)",margin:"6px 0 10px"},
  sub:{color:"#a888b3",fontSize:13,marginTop:4,marginBottom:22,fontFamily:"'Lora',serif"},
  statsRow:{display:"flex",gap:14,marginBottom:8,flexWrap:"wrap"},
  statBox:{background:"#ffffff",border:"1px solid #f0e5ec",borderRadius:16,padding:"16px 24px",textAlign:"center",boxShadow:"0 4px 16px rgba(124,58,237,0.08), 0 1px 3px rgba(0,0,0,0.03)",minWidth:130,transition:"transform 0.2s ease"},
  tableWrap:{background:"#ffffff",border:"1px solid #f0e5ec",borderRadius:18,overflow:"auto",boxShadow:"0 8px 30px rgba(124,58,237,0.09), 0 2px 6px rgba(0,0,0,0.03)"},
  table:{width:"100%",borderCollapse:"collapse",fontFamily:"'Lora',serif"},
  th:{padding:"14px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"#8b6a9a",textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:"1.5px solid #eee0ea",background:"#faf6fb"},
  td:{padding:"13px 16px",borderBottom:"1px solid #f4ecf1",color:"#3d2436",fontSize:13,fontFamily:"'Lora',serif"},
  idBadge:{display:"inline-flex",alignItems:"center",justifyContent:"center",width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#7c3aed,#d4709a)",color:"#fff",fontSize:12,fontWeight:700,fontFamily:"'Lora',serif",boxShadow:"0 2px 6px rgba(124,58,237,0.3)"},
  moduleBadge:{background:"#f8fafc",color:"#334155",padding:"2px 8px",borderRadius:6,fontSize:10,fontWeight:600,whiteSpace:"nowrap",border:"1px solid #e2e8f0",fontFamily:"'Lora',serif"},
  select:{background:"#faf6fb",border:"1px solid #ecdde6",color:"#2d1b30",padding:"6px 10px",borderRadius:8,fontSize:12,cursor:"pointer",fontFamily:"'Lora',serif"},
  numInput:{width:80,background:"#faf6fb",border:"1px solid #ecdde6",color:"#2d1b30",padding:"6px 10px",borderRadius:8,fontSize:12,textAlign:"center",fontFamily:"'Lora',serif"},
  viewBtn:{background:"rgba(59,130,246,0.08)",border:"1px solid rgba(59,130,246,0.25)",color:"#2563eb",padding:"6px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"'Lora',serif"},
  approveBtn:{background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.25)",color:"#16a34a",padding:"6px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"'Lora',serif"},
  deleteBtn:{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",color:"#dc2626",padding:"6px 10px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"'Lora',serif"},
  modalOverlay:{position:"fixed",inset:0,background:"rgba(45,27,48,0.55)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20},
  modal:{background:"#ffffff",border:"1px solid #ecdde6",borderRadius:20,padding:32,maxWidth:440,width:"90%",boxShadow:"0 20px 60px rgba(124,58,237,0.2)",fontFamily:"'Lora',serif"},
  deleteConfirmBtn:{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",color:"#dc2626",padding:"10px 20px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600,flex:1,fontFamily:"'Lora',serif"},
  cancelBtn:{background:"#f8fafc",border:"1px solid #ecdde6",color:"#8b6a9a",padding:"10px 20px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"'Lora',serif"},
};
