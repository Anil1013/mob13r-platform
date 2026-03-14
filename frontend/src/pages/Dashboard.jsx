import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import * as XLSX from "xlsx";

export default function Dashboard() {

  const today = new Date().toISOString().slice(0,10);

  const [data,setData] = useState([]);
  const [stats,setStats] = useState({});

  const [from,setFrom] = useState(today);
  const [to,setTo] = useState(today);

  const [operator,setOperator] = useState("");
  const [offer,setOffer] = useState("");

  /* LOAD REPORT */

  const loadReport = async () => {

    let url = `/api/dashboard/report?from=${from}&to=${to}`;

    if(operator) url += `&operator=${operator}`;
    if(offer) url += `&offer_id=${offer}`;

    const res = await fetch(url);
    const json = await res.json();

    setData(json.data || []);
  };

  /* REALTIME */

  const loadRealtime = async () => {

    const res = await fetch("/api/dashboard/realtime");
    const json = await res.json();

    setStats(json.data || {});
  };

  useEffect(()=>{

    loadReport();
    loadRealtime();

  },[]);

  /* EXPORT */

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

  /* TOTAL CALCULATION */

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

  return (
    <>
      <Navbar />

      <div style={styles.container}>

        {/* STATS */}

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

        {/* FILTERS */}

        <div style={styles.filters}>

          <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} />
          <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} />

          <input placeholder="Operator" value={operator} onChange={(e)=>setOperator(e.target.value)} />
          <input placeholder="Offer ID" value={offer} onChange={(e)=>setOffer(e.target.value)} />

          <button onClick={loadReport}>Apply</button>

          <button onClick={exportCSV}>Export CSV</button>
          <button onClick={exportExcel}>Export Excel</button>

        </div>

        {/* TABLE */}

        <div style={styles.tableWrapper}>

        <table style={styles.table}>

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
              <th>Last Pin Gen Success</th>
              <th>Last Verification</th>
              <th>Last Success Verification</th>
            </tr>
          </thead>

          <tbody>

            {data.map((row,i)=>(

              <tr key={i}>

                <td>{row.date}</td>
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
                <td>{row.revenue}</td>

                <td>{row.last_pin_gen}</td>
                <td>{row.last_pin_gen_success}</td>
                <td>{row.last_verification}</td>
                <td>{row.last_success_verification}</td>

              </tr>

            ))}

            {/* TOTAL ROW */}

            <tr style={styles.totalRow}>

              <td colSpan="8">TOTAL</td>

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
  padding:"20px 25px",
  fontFamily:"Lora, serif",
  background:"#f7f7f7"
},

stats:{
  display:"flex",
  gap:"8px",
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
  fontSize:"12px"
},

totalRow:{
  background:"#efefef",
  fontWeight:"bold"
}

};
