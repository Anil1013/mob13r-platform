import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import * as XLSX from "xlsx";

const API = "https://backend.mob13r.com";

export default function Dashboard(){

const today = new Date().toISOString().slice(0,10);

const [data,setData] = useState([]);
const [stats,setStats] = useState({});
const [filters,setFilters] = useState({
 advertisers:[],
 publishers:[],
 geos:[],
 carriers:[],
 offers:[]
});

const [from,setFrom] = useState(today);
const [to,setTo] = useState(today);

const [advertiser,setAdvertiser] = useState("");
const [publisher,setPublisher] = useState("");
const [geo,setGeo] = useState("");
const [carrier,setCarrier] = useState("");
const [offer,setOffer] = useState("");

/* ---------------- REPORT ---------------- */

const loadReport = async () => {

 try{

 const params = new URLSearchParams();

 params.append("from",from);
 params.append("to",to);

 if(advertiser) params.append("advertiser",advertiser);
 if(publisher) params.append("publisher",publisher);
 if(geo) params.append("geo",geo);
 if(carrier) params.append("carrier",carrier);
 if(offer) params.append("offer",offer);

 const res = await fetch(`${API}/api/dashboard/report?${params.toString()}`);

 const json = await res.json();

 if(json.status === "SUCCESS"){
  setData(json.data || []);
 }else{
  setData([]);
 }

 }catch(err){
  console.log("Report Error:",err);
 }

};


/* ---------------- FILTERS ---------------- */

const loadFilters = async () => {

 try{

 const res = await fetch(`${API}/api/dashboard/filters`);
 const json = await res.json();

 setFilters({
  advertisers: json.advertisers || [],
  publishers: json.publishers || [],
  geos: json.geos || [],
  carriers: json.carriers || [],
  offers: json.offers || []
 });

 }catch(err){
  console.log("Filter error",err);
 }

};


/* ---------------- REALTIME ---------------- */

const loadRealtime = async () => {

 try{

 const res = await fetch(`${API}/api/dashboard/realtime`);
 const json = await res.json();

 setStats(json.data || {});

 }catch(err){
  console.log("Realtime error",err);
 }

};


useEffect(()=>{

 loadReport();
 loadRealtime();
 loadFilters();

},[]);


/* ---------------- EXPORT ---------------- */

const exportExcel = () => {

 const worksheet = XLSX.utils.json_to_sheet(data);
 const workbook = XLSX.utils.book_new();

 XLSX.utils.book_append_sheet(workbook,worksheet,"Report");

 XLSX.writeFile(workbook,"traffic_report.xlsx");
};


const exportCSV = () => {

 if(!data.length) return;

 const rows = data.map(row => Object.values(row).join(","));
 const csv = [Object.keys(data[0]).join(","),...rows].join("\n");

 const blob = new Blob([csv],{type:"text/csv"});
 const url = window.URL.createObjectURL(blob);

 const a = document.createElement("a");

 a.href = url;
 a.download = "traffic_report.csv";
 a.click();

};


/* ---------------- TOTAL ---------------- */

const total = data.reduce((acc,row)=>{

 acc.pin_req += Number(row.pin_req||0);
 acc.unique_req += Number(row.unique_req||0);
 acc.pin_sent += Number(row.pin_sent||0);
 acc.unique_sent += Number(row.unique_sent||0);
 acc.verify_req += Number(row.verify_req||0);
 acc.unique_verify += Number(row.unique_verify||0);
 acc.verified += Number(row.verified||0);
 acc.revenue += Number(row.revenue||0);

 return acc;

},{
 pin_req:0,
 unique_req:0,
 pin_sent:0,
 unique_sent:0,
 verify_req:0,
 unique_verify:0,
 verified:0,
 revenue:0
});


return(

<>
<Navbar/>

<div style={styles.container}>


{/* -------- STATS -------- */}

<div style={styles.stats}>

<div style={{...styles.card,background:"#e8f1ff"}}>
Requests
<strong>{stats.total_requests || 0}</strong>
</div>

<div style={{...styles.card,background:"#e7fff3"}}>
OTP Sent
<strong>{stats.otp_sent || 0}</strong>
</div>

<div style={{...styles.card,background:"#fff3e8"}}>
Conversions
<strong>{stats.conversions || 0}</strong>
</div>

<div style={{...styles.card,background:"#f3e8ff"}}>
Last Hour
<strong>{stats.last_hour_requests || 0}</strong>
</div>

</div>


{/* -------- FILTERS -------- */}

<div style={styles.filters}>

<input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} />
<input type="date" value={to} onChange={(e)=>setTo(e.target.value)} />

<select value={advertiser} onChange={(e)=>setAdvertiser(e.target.value)}>
<option value="">All Advertisers</option>
{filters.advertisers.map(a=>(
<option key={a.id} value={a.id}>{a.name}</option>
))}
</select>

<select value={publisher} onChange={(e)=>setPublisher(e.target.value)}>
<option value="">All Publishers</option>
{filters.publishers.map(p=>(
<option key={p.id} value={p.id}>{p.name}</option>
))}
</select>

<select value={geo} onChange={(e)=>setGeo(e.target.value)}>
<option value="">All Geo</option>
{filters.geos.map(g=>(
<option key={g}>{g}</option>
))}
</select>

<select value={carrier} onChange={(e)=>setCarrier(e.target.value)}>
<option value="">All Carrier</option>
{filters.carriers.map(c=>(
<option key={c}>{c}</option>
))}
</select>

<select value={offer} onChange={(e)=>setOffer(e.target.value)}>
<option value="">All Offers</option>
{filters.offers.map(o=>(
<option key={o.id} value={o.id}>{o.offer_name}</option>
))}
</select>

<button onClick={loadReport}>Apply</button>

<button onClick={exportCSV}>Export CSV</button>
<button onClick={exportExcel}>Export Excel</button>

</div>


{/* -------- TABLE -------- */}

<div style={styles.tableWrapper}>

<table style={styles.table}>

<thead>
<tr>

<th>Date</th>
<th>Offer</th>
<th>Publisher</th>
<th>Geo</th>
<th>Carrier</th>
<th>CPA</th>
<th>Cap</th>

<th>Pin Req</th>
<th>Unique Req</th>
<th>Pin Sent</th>
<th>Unique Sent</th>

<th>Verify Req</th>
<th>Unique Verify</th>

<th>Verified</th>
<th>CR %</th>
<th>Revenue</th>

<th>Last Pin Gen</th>
<th>Last Pin Gen Success</th>
<th>Last Verification</th>
<th>Last Success Verification</th>

</tr>
</thead>

<tbody>

{data.map((row,i)=>(
<tr key={i}>

<td>{row.date?.slice(0,10)}</td>
<td>{row.offer_name}</td>
<td>{row.publisher_name}</td>
<td>{row.geo}</td>
<td>{row.carrier}</td>
<td>{row.cpa}</td>
<td>{row.cap}</td>

<td>{row.pin_req}</td>
<td>{row.unique_req}</td>

<td>{row.pin_sent}</td>
<td>{row.unique_sent}</td>

<td>{row.verify_req}</td>
<td>{row.unique_verify}</td>

<td>{row.verified}</td>
<td>{row.cr_percent}</td>
<td>{row.revenue}</td>

<td>{row.last_pin_gen}</td>
<td>{row.last_pin_gen_success}</td>
<td>{row.last_verification}</td>
<td>{row.last_success_verification}</td>

</tr>
))}

<tr style={styles.totalRow}>

<td colSpan="7">TOTAL</td>

<td>{total.pin_req}</td>
<td>{total.unique_req}</td>

<td>{total.pin_sent}</td>
<td>{total.unique_sent}</td>

<td>{total.verify_req}</td>
<td>{total.unique_verify}</td>

<td>{total.verified}</td>
<td>-</td>

<td>${total.revenue.toFixed(2)}</td>

<td colSpan="4"></td>

</tr>

</tbody>

</table>

</div>

</div>
</>

);

}


const styles = {

container:{
padding:"20px",
fontFamily:"Lora, serif",
background:"#f7f7f7",
textAlign:"center"
},

stats:{
display:"flex",
justifyContent:"center",
gap:"10px",
marginBottom:"12px"
},

card:{
padding:"6px 12px",
borderRadius:"4px",
fontSize:"12px",
border:"1px solid #ccc"
},

filters:{
display:"flex",
justifyContent:"center",
gap:"6px",
marginBottom:"10px",
flexWrap:"wrap"
},

tableWrapper:{
overflowX:"auto",
background:"#fff",
border:"1px solid #999"
},

table:{
borderCollapse:"collapse",
width:"100%",
minWidth:"1700px",
fontSize:"12px",
textAlign:"center"
},

totalRow:{
background:"#efefef",
fontWeight:"bold"
}

};
