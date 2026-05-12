import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { btn, btnRed, input, table, th, td, badge, page } from "../styles/shared.js";
const API_BASE = "https://backend.mob13r.com";

export default function Advertisers() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [list, setList] = useState([]);
  const [form, setForm] = useState({name:"",email:""});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(()=>{ if(!token) navigate("/login"); else load(); },[]);

  const load = async () => {
    const res = await fetch(`${API_BASE}/api/advertisers`,{headers:{Authorization:`Bearer ${token}`}});
    const data = await res.json();
    setList(Array.isArray(data)?data:[]);
  };

  const showToast=(msg,type="success")=>{ setToast({msg,type}); setTimeout(()=>setToast(null),2500); };

  const save = async () => {
    if(!form.name.trim()) return showToast("Name required","error");
    setLoading(true);
    const res = await fetch(`${API_BASE}/api/advertisers`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(form)});
    if(res.ok){ showToast("Advertiser added"); setForm({name:"",email:""}); load(); }
    else showToast("Failed","error");
    setLoading(false);
  };

  const toggle = async(id)=>{
    await fetch(`${API_BASE}/api/advertisers/${id}/toggle`,{method:"PATCH",headers:{Authorization:`Bearer ${token}`}});
    load();
  };

  const filtered = list.filter(a=>a.name?.toLowerCase().includes(search.toLowerCase())||a.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <Navbar/>
      {toast&&<Toast msg={toast.msg} type={toast.type}/>}
      <div style={page}>
        <div style={S.header}>
          <div>
            <h1 style={S.title}>Advertisers</h1>
            <p style={S.sub}>{list.length} total</p>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:24}}>
          <div style={S.card}>
            <h3 style={S.cardTitle}>Add Advertiser</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:12,alignItems:"end"}}>
              <input style={input} placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
              <input style={input} placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
              <button style={{...btn,opacity:loading?0.7:1}} onClick={save} disabled={loading}>{loading?"Adding...":"Add"}</button>
            </div>
          </div>
          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h3 style={S.cardTitle}>All Advertisers</h3>
              <input style={{...input,width:220}} placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={table}>
                <thead><tr>{["ID","Name","Email","Status","Created","Action"].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {filtered.map(a=>(
                    <tr key={a.id}>
                      <td style={td}><span style={{background:"rgba(59,130,246,0.1)",color:"#3b82f6",padding:"2px 8px",borderRadius:6,fontSize:12,fontWeight:600}}>{a.id}</span></td>
                      <td style={{...td,color:"#f1f5f9",fontWeight:500}}>{a.name}</td>
                      <td style={td}>{a.email}</td>
                      <td style={td}><span style={badge(a.status==="active"?"green":"red")}>{a.status==="active"?"● Active":"● Inactive"}</span></td>
                      <td style={td}>{new Date(a.created_at).toLocaleDateString()}</td>
                      <td style={td}><button style={a.status==="active"?btnRed:btn} onClick={()=>toggle(a.id)}>{a.status==="active"?"Pause":"Activate"}</button></td>
                    </tr>
                  ))}
                  {!filtered.length&&<tr><td colSpan="6" style={{...td,textAlign:"center",padding:40,color:"#475569"}}>No advertisers found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Toast({msg,type}){ return <div style={{position:"fixed",top:80,right:24,zIndex:9999,background:type==="error"?"rgba(239,68,68,0.15)":"rgba(34,197,94,0.15)",border:`1px solid ${type==="error"?"rgba(239,68,68,0.3)":"rgba(34,197,94,0.3)"}`,color:type==="error"?"#ef4444":"#22c55e",padding:"12px 20px",borderRadius:12,fontSize:13,fontWeight:500,backdropFilter:"blur(10px)"}}>{msg}</div>; }

const S = {
  header:{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:32 },
  title:{ fontFamily:"Syne,sans-serif",fontSize:28,fontWeight:700,color:"#f1f5f9" },
  sub:{ color:"#475569",fontSize:13,marginTop:4 },
  card:{ background:"#0d1326",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:24 },
  cardTitle:{ fontFamily:"Syne,sans-serif",fontSize:16,fontWeight:600,color:"#f1f5f9",marginBottom:20 },
};
