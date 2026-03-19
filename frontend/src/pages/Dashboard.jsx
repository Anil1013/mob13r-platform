import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import * as XLSX from "xlsx";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

const formatDate = (date) => {
 if (!date) return "";

 return new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true
 }).format(new Date(date));
};

export default function Dashboard() {

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

/*
============================
LOAD REPORT
============================
*/

const loadReport = async () => {

 const params = new URLSearchParams();

 params.append("from",from);
 params.append("to",to);

 if(advertiser) params.append("advertiser",advertiser);
 if(publisher) params.append("publisher",publisher);
 if(geo) params.append("geo",geo);
 if(carrier) params.append("carrier",carrier);
 if(offer) params.append("offer_id",offer);

 const res = await fetch(
 `${API_BASE}/api/dashboard/report?${params.toString()}`
 );

 const json = await res.json();

 if(json.status === "SUCCESS"){
  setData(json.data);
 }else{
  setData([]);
 }

};

/*
============================
LOAD FILTERS
============================
*/

const loadFilters = async () => {

 const res = await fetch(`${API_BASE}/api/dashboard/filters`);
 const json = await res.json();

 setFilters(json);

};

/*
============================
REALTIME STATS
============================
*/

const loadRealtime = async () => {

 const res = await fetch(`${API_BASE}/api/dashboard/realtime`);
 const json = await res.json();

 setStats(json.data || {});
};

useEffect(()=>{

 loadReport();
 loadFilters();
 loadRealtime();

},[]);


/*
============================
EXPORT
============================
*/

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

/*
============================
TOTALS
============================
*/

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

<div style={{padding:"20px",fontFamily:"Lora, serif"}}>

{/* STATS */}

<div style={{display:"flex",gap:"10px",marginBottom:"15px"}}>

<div style={{background:"#e8f1ff",padding:"8px"}}>
Requests <b>{stats.total_requests || 0}</b>
</div>

<div style={{background:"#e7fff3",padding:"8px"}}>
OTP Sent <b>{stats.otp_sent || 0}</b>
</div>

<div style={{background:"#fff3e8",padding:"8px"}}>
Conversions <b>{stats.conversions || 0}</b>
</div>

<div style={{background:"#f3e8ff",padding:"8px"}}>
Last Hour <b>{stats.last_hour_requests || 0}</b>
</div>

</div>

{/* FILTERS */}

<div style={{marginBottom:"15px"}}>

<input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} />
<input type="date" value={to} onChange={(e)=>setTo(e.target.value)} />

<select value={advertiser} onChange={(e)=>setAdvertiser(e.target.value)}>
<option value="">All Advertisers</option>
{filters.advertisers?.map(a=>(
<option key={a.id} value={a.id}>{a.name}</option>
))}
</select>

<select value={publisher} onChange={(e)=>setPublisher(e.target.value)}>
<option value="">All Publishers</option>
{filters.publishers?.map(p=>(
<option key={p.id} value={p.id}>{p.name}</option>
))}
</select>

<select value={geo} onChange={(e)=>setGeo(e.target.value)}>
<option value="">All Geo</option>
{filters.geos?.map(g=>(
<option key={g}>{g}</option>
))}
</select>

<select value={carrier} onChange={(e)=>setCarrier(e.target.value)}>
<option value="">All Carrier</option>
{filters.carriers?.map(c=>(
<option key={c}>{c}</option>
))}
</select>

<select value={offer} onChange={(e)=>setOffer(e.target.value)}>
<option value="">All Offers</option>
{filters.offers?.map(o=>(
<option key={o.id} value={o.id}>{o.offer_name}</option>
))}
</select>

<button onClick={loadReport}>Apply</button>

<button onClick={exportCSV}>Export CSV</button>
<button onClick={exportExcel}>Export Excel</button>

</div>

{/* TABLE */}

<div style={{overflowX:"auto"}}>

<table border="1" cellPadding="8" width="100%" style={{ textAlign:"center" }}>

<thead>

<tr>

<th>Date</th>
<th>Advertiser</th>
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
<th>Last Verification</th>
<th>Last Success Verification</th>

</tr>

</thead>

<tbody>

{data.map((row,i)=>(

<tr key={i}>

<td>{formatDate(row.date)}</td>
<td>{row.advertiser_name}</td>
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
<td>${row.revenue}</td>

<td>{formatDate(row.last_pin_gen)}</td>
<td>{formatDate(row.last_verification)}</td>
<td>{formatDate(row.last_success_verification)}</td>

</tr>

))}

<tr>

<td colSpan="8"><b>TOTAL</b></td>

<td>{total.pin_req}</td>
<td>{total.unique_req}</td>

<td>{total.pin_sent}</td>
<td>{total.unique_sent}</td>

<td>{total.verify_req}</td>
<td>{total.unique_verify}</td>

<td>{total.verified}</td>
<td>-</td>

<td>${total.revenue.toFixed(2)}</td>

<td colSpan="3"></td>

</tr>

</tbody>

</table>

</div>

</div>

</>

);

}
