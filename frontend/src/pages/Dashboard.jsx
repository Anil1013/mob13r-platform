import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import * as XLSX from "xlsx";

export default function Dashboard() {

  const [data,setData] = useState([]);
  const [stats,setStats] = useState({});

  const [from,setFrom] = useState("");
  const [to,setTo] = useState("");
  const [operator,setOperator] = useState("");
  const [offer,setOffer] = useState("");

  /* LOAD REPORT */

  const loadReport = async () => {

    let url = "/api/dashboard/report?";

    if(from) url += `from=${from}&`;
    if(to) url += `to=${to}&`;
    if(operator) url += `operator=${operator}&`;
    if(offer) url += `offer_id=${offer}&`;

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

    const interval = setInterval(loadRealtime,5000);

    return () => clearInterval(interval);

  },[]);

  /* EXPORT EXCEL */

  const exportExcel = () => {

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook,worksheet,"Report");

    XLSX.writeFile(workbook,"traffic_report.xlsx");
  };

  /* EXPORT CSV */

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

  return (
    <>
      <Navbar />

      <div style={styles.container}>

        {/* SMALL COLORED STATS */}

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

          <input
          type="date"
          value={from}
          onChange={(e)=>setFrom(e.target.value)}
          />

          <input
          type="date"
          value={to}
          onChange={(e)=>setTo(e.target.value)}
          />

          <input
          placeholder="Operator"
          value={operator}
          onChange={(e)=>setOperator(e.target.value)}
          />

          <input
          placeholder="Offer ID"
          value={offer}
          onChange={(e)=>setOffer(e.target.value)}
          />

          <button onClick={loadReport}>
            Apply
          </button>

          <button onClick={exportCSV}>
            Export CSV
          </button>

          <button onClick={exportExcel}>
            Export Excel
          </button>

        </div>

        {/* REPORT TABLE */}

        <div style={styles.tableWrapper}>

        <table style={styles.table}>

          <thead>

            <tr>

              {[
                "Date","Advertiser","Offer","Publisher","Geo","Carrier",
                "CPA","Cap","Pin Req","Unique Req",
                "Pin Sent","Unique Sent",
                "Verify Req","Unique Verify",
                "Verified","CR %",
                "Revenue",
                "Last Pin Gen",
                "Last Pin Gen Success",
                "Last Verification",
                "Last Success Verification"
              ].map(col=>(
                <th key={col} style={styles.th}>{col}</th>
              ))}

            </tr>

          </thead>

          <tbody>

            {data.map((row,i)=>(

              <tr key={i}>

                <td style={styles.td}>{row.date}</td>
                <td style={styles.td}>{row.advertiser_name}</td>
                <td style={styles.td}>{row.offer_name}</td>
                <td style={styles.td}>{row.publisher_name}</td>
                <td style={styles.td}>{row.geo}</td>
                <td style={styles.td}>{row.carrier}</td>
                <td style={styles.td}>{row.cpa}</td>
                <td style={styles.td}>{row.cap}</td>

                <td style={styles.td}>{row.pin_req}</td>
                <td style={styles.td}>{row.unique_req}</td>

                <td style={styles.td}>{row.pin_sent}</td>
                <td style={styles.td}>{row.unique_sent}</td>

                <td style={styles.td}>{row.verify_req}</td>
                <td style={styles.td}>{row.unique_verify}</td>

                <td style={styles.td}>{row.verified}</td>
                <td style={styles.td}>{row.cr_percent}</td>
                <td style={styles.td}>{row.revenue}</td>

                <td style={styles.td}>{row.last_pin_gen}</td>
                <td style={styles.td}>{row.last_pin_gen_success}</td>
                <td style={styles.td}>{row.last_verification}</td>
                <td style={styles.td}>{row.last_success_verification}</td>

              </tr>

            ))}

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
  fontFamily:"Arial, Helvetica, sans-serif",
  background:"#f7f7f7",
  minHeight:"100vh"
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
  fontWeight:"600",
  display:"flex",
  flexDirection:"column",
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

th:{
  border:"1px solid #999",
  padding:"6px 8px",
  background:"#efefef",
  whiteSpace:"nowrap",
  fontWeight:"600"
},

td:{
  border:"1px solid #ccc",
  padding:"6px 8px",
  whiteSpace:"nowrap"
}

};
