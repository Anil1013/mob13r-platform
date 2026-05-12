import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { btn, input, table, th, td, badge, page } from "../styles/shared.js";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

export default function Publishers() {
  const navigate = useNavigate();
  const [publishers, setPublishers] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [visibleKeys, setVisibleKeys] = useState({});
  const token = localStorage.getItem("token");

  useEffect(()=>{ if(!token) navigate("/login"); else load(); },[]);

  const load = async()=>{
    const res = await fetch(`${API_BASE}/api/publishers`,{headers:{Authorization:`Bearer ${token}`}});
    const data = await res.json();
    if(data.status==="SUCCESS") setPublishers(data.data);
  };

  const showToast=(msg,type="success")=>{ setToast({msg,type}); setTimeout(()=>setToast(null),2500); };

  const add = async()=>{
    if(!name.trim()) return showToast("Name required","error");
    setLoading(true);
    const res = await fetch(`${API_BASE}/api/publishers`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({name})});
    const data = await res.json();
    if(data.status==="SUCCESS"){ setPublishers(p=>[...p,data.data]); setName(""); showToast("Publisher added"); }
    setLoading(false);
  };

  const toggleStatus = async(id,status)=>{
    const newStatus = status==="active"?"paused":"active";
    setPublishers(list=>list.map(p=>p.id===id?{...p,status:newStatus}:p));
    const res = await fetch(`${API_BASE}/api/publishers/${id}/status`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({status:newStatus})});
    if(!res.ok){ setPublishers(list=>list.map(p=>p.id===id?{...p,status}:p)); showToast("Failed","error"); }
  };

  const copyKey = async(key)=>{ await navigator.clipboard.writeText(key); showToast("Copied!"); };

  const openDashboard=(p)=>{
    localStorage.setItem("publisher_key",p.api_key);
    localStorage.setItem("publisher_id",p.id);
    localStorage.setItem("publisher_name",p.name);
    navigate("/publisher/dashboard");
  };

  return (
    <>
      <Navbar/>
      {toast&&<Toast msg={toast.msg} type={toast.type}/>}
      <div style={page}>
        <div style={S.header}>
          <div>
            <h1 style={S.title}>Publishers</h1>
            <p style={S.sub}>{publishers.length} publishers</p>
          </div>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <input style={{...input,width:240}} placeholder="Publisher name" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()}/>
            <button style={{...btn,opacity:loading?0.7:1}} onClick={add} disabled={loading}>{loading?"Adding...":"+ Add Publisher"}</button>
          </div>
        </div>
        <div style={{background:"#0d1326",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
            <table style={table}>
              <thead><tr>{["ID","Name","API Key","Status","Created","Actions"].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {publishers.map(p=>(
                  <tr key={p.id}>
                    <td style={td}><span style={{background:"rgba(59,130,246,0.1)",color:"#3b82f6",padding:"2px 8px",borderRadius:6,fontSize:12,fontWeight:600}}>{p.id}</span></td>
                    <td style={{...td,color:"#f1f5f9",fontWeight:500}}>{p.name}</td>
                    <td style={td}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <code style={{fontFamily:"monospace",fontSize:12,color:"#94a3b8",background:"rgba(255,255,255,0.04)",padding:"4px 10px",borderRadius:6}}>{visibleKeys[p.id]?p.api_key:"••••••••••••••••••••"}</code>
                        <button style={S.iconBtn} onClick={()=>setVisibleKeys(v=>({...v,[p.id]:!v[p.id]}))}>👁</button>
                        <button style={S.iconBtn} onClick={()=>copyKey(p.api_key)}>📋</button>
                      </div>
                    </td>
                    <td style={td}><span style={badge(p.status==="active"?"green":"red")}>{p.status==="active"?"● Active":"● Paused"}</span></td>
                    <td style={td}>{new Date(p.created_at).toLocaleDateString()}</td>
                    <td style={td}>
                      <div style={{display:"flex",gap:8}}>
                        <button style={{padding:"7px 14px",borderRadius:8,border:"none",background:p.status==="active"?"rgba(245,158,11,0.1)":"rgba(59,130,246,0.1)",color:p.status==="active"?"#f59e0b":"#3b82f6",cursor:"pointer",fontSize:12,fontWeight:500}} onClick={()=>toggleStatus(p.id,p.status)}>{p.status==="active"?"Pause":"Activate"}</button>
                        <button style={{padding:"7px 14px",borderRadius:8,border:"none",background:"rgba(99,102,241,0.1)",color:"#6366f1",cursor:"pointer",fontSize:12,fontWeight:500}} onClick={()=>navigate(`/publishers/assign?publisherId=${p.id}`)}>Assign</button>
                        <button style={{padding:"7px 14px",borderRadius:8,border:"none",background:"rgba(34,197,94,0.1)",color:"#22c55e",cursor:"pointer",fontSize:12,fontWeight:500}} onClick={()=>openDashboard(p)}>Dashboard</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!publishers.length&&<tr><td colSpan="6" style={{...td,textAlign:"center",padding:40,color:"#475569"}}>No publishers yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function Toast({msg,type}){ return <div style={{position:"fixed",top:80,right:24,zIndex:9999,background:type==="error"?"rgba(239,68,68,0.15)":"rgba(34,197,94,0.15)",border:`1px solid ${type==="error"?"rgba(239,68,68,0.3)":"rgba(34,197,94,0.3)"}`,color:type==="error"?"#ef4444":"#22c55e",padding:"12px 20px",borderRadius:12,fontSize:13,fontWeight:500}}>{msg}</div>; }

const S = {
  header:{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:32,flexWrap:"wrap",gap:16 },
  title:{ fontFamily:"Syne,sans-serif",fontSize:28,fontWeight:700,color:"#f1f5f9" },
  sub:{ color:"#475569",fontSize:13,marginTop:4 },
  iconBtn:{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#94a3b8",padding:"4px 8px",borderRadius:6,cursor:"pointer",fontSize:12 },
};
