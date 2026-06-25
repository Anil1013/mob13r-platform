import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { btn, btnRed, input, table, th, td, badge, page } from "../styles/shared.js";
const API_BASE = "https://backend.mob13r.com";
export default function Advertisers() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [list,setList] = useState([]);
  const [form,setForm] = useState({name:"",email:""});
  const [search,setSearch] = useState("");
  const [loading,setLoading] = useState(false);
  const [toast,setToast] = useState(null);
  useEffect(()=>{ if(!token) navigate("/login"); else load(); },[]);
  const load = async()=>{
    const res = await fetch(`${API_BASE}/api/advertisers`,{headers:{Authorization:`Bearer ${token}`}});
    const data = await res.json();
    setList(Array.isArray(data)?data:[]);
  };
  const showToast=(msg,type="success")=>{ setToast({msg,type}); setTimeout(()=>setToast(null),2500); };
  const save = async()=>{
    if(!form.name.trim()) return showToast("Name required","error");
    setLoading(true);
    const res = await fetch(`${API_BASE}/api/advertisers`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(form)});
    if(res.ok){ showToast("Added!"); setForm({name:"",email:""}); load(); } else showToast("Failed","error");
    setLoading(false);
  };
  const toggle=async(id)=>{ await fetch(`${API_BASE}/api/advertisers/${id}/toggle`,{method:"PATCH",headers:{Authorization:`Bearer ${token}`}}); load(); };
  const filtered=list.filter(a=>a.name?.toLowerCase().includes(search.toLowerCase())||a.email?.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <Navbar/>
      {toast&&<div style={{position:"fixed",top:80,right:24,zIndex:9999,background:toast.type==="error"?"rgba(239,68,68,0.06)":"rgba(34,197,94,0.06)",border:`1px solid ${toast.type==="error"?"rgba(239,68,68,0.3)":"rgba(34,197,94,0.3)"}`,color:toast.type==="error"?"#dc2626":"#16a34a",padding:"12px 20px",borderRadius:12,fontSize:13,fontWeight:500}}>{toast.msg}</div>}
      <div style={page}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:32}}>
          <div><h1 style={{fontFamily:"Syne,sans-serif",fontSize:28,fontWeight:700,color:"#1e293b"}}>Advertisers</h1><p style={{color:"#64748b",fontSize:13,marginTop:4}}>{list.length} total</p></div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:24}}>
          <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:16,padding:24,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
            <h3 style={{fontFamily:"Syne,sans-serif",fontSize:16,fontWeight:600,color:"#1e293b",marginBottom:20}}>Add Advertiser</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:12,alignItems:"end"}}>
              <input style={input} placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
              <input style={input} placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
              <button style={{...btn,opacity:loading?0.7:1}} onClick={save} disabled={loading}>{loading?"Adding...":"Add"}</button>
            </div>
          </div>
          <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:16,padding:24,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h3 style={{fontFamily:"Syne,sans-serif",fontSize:16,fontWeight:600,color:"#1e293b"}}>All Advertisers</h3>
              <input style={{...input,width:220}} placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={table}>
                <thead><tr>{["ID","Name","Email","Status","Created","Action"].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {filtered.map(a=>(
                    <tr key={a.id}>
                      <td style={td}><span style={{background:"rgba(59,130,246,0.08)",color:"#2563eb",padding:"2px 8px",borderRadius:6,fontSize:12,fontWeight:600}}>{a.id}</span></td>
                      <td style={{...td,color:"#1e293b",fontWeight:500}}>{a.name}</td>
                      <td style={td}>{a.email}</td>
                      <td style={td}><span style={badge(a.status==="active"?"green":"red")}>{a.status==="active"?"● Active":"● Inactive"}</span></td>
                      <td style={td}>{new Date(a.created_at).toLocaleDateString()}</td>
                      <td style={td}><button style={a.status==="active"?btnRed:btn} onClick={()=>toggle(a.id)}>{a.status==="active"?"Pause":"Activate"}</button></td>
                    </tr>
                  ))}
                  {!filtered.length&&<tr><td colSpan="6" style={{...td,textAlign:"center",padding:40,color:"#64748b"}}>No advertisers found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
