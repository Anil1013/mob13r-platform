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

  const exportExcel = () => {

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook,worksheet,"Report");

    XLSX.writeFile(workbook,"traffic_report.xlsx");
  };

  const exportCSV = () => {

    const rows = data.map(row => Object.values(row).join(","));
    const csv = [Object.keys(data[0] || {}).join(","),...rows].join("\n");

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

        {/* STATS */}

        <div style={styles.stats}>

          <div style={styles.card}>
            <span>Requests</span>
            <h3>{stats.total_requests || 0}</h3>
          </div>

          <div style={styles.card}>
            <span>OTP Sent</span>
            <h3>{stats.otp_sent || 0}</h3>
          </div>

          <div style={styles.card}>
            <span>Conversions</span>
            <h3>{stats.conversions || 0}</h3>
          </div>

          <div style={styles.card}>
            <span>Last Hour</span>
            <h3>{stats.last_hour_requests || 0}</h3>
          </div>

        </div>

        {/* FILTERS */}

        <div style={styles.filters}>

          <input
          type="date"
          value={from}
          onChange={(e)=>setFrom(e.target.value)}
          style={styles.input}
          />

          <input
          type="date"
          value={to}
          onChange={(e)=>setTo(e.target.value)}
          style={styles.input}
          />

          <input
          placeholder="Operator"
          value={operator}
          onChange={(e)=>setOperator(e.target.value)}
          style={styles.input}
          />

          <input
          placeholder="Offer ID"
          value={offer}
          onChange={(e)=>setOffer(e.target.value)}
          style={styles.input}
          />

          <button style={styles.button} onClick={loadReport}>
            Filter
          </button>

          <button style={styles.buttonSecondary} onClick={exportCSV}>
            CSV
          </button>

          <button style={styles.buttonSecondary} onClick={exportExcel}>
            Excel
          </button>

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

          </tbody>

        </table>

        </div>

      </div>
    </>
  );
}

const styles = {

  container:{
    padding:"40px 30px",
    fontFamily:"Inter, system-ui, Arial",
    background:"#fafafa",
    minHeight:"100vh"
  },

  stats:{
    display:"flex",
    gap:"15px",
    marginBottom:"15px"
  },

  card:{
    background:"#ffffff",
    padding:"10px 16px",
    borderRadius:"8px",
    boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
    minWidth:"130px"
  },

  filters:{
    marginBottom:"15px",
    display:"flex",
    gap:"10px",
    flexWrap:"wrap"
  },

  input:{
    padding:"6px 8px",
    border:"1px solid #d1d5db",
    borderRadius:"6px"
  },

  button:{
    padding:"6px 14px",
    background:"#2563eb",
    color:"#fff",
    border:"none",
    borderRadius:"6px",
    cursor:"pointer"
  },

  buttonSecondary:{
    padding:"6px 12px",
    background:"#e5e7eb",
    border:"none",
    borderRadius:"6px",
    cursor:"pointer"
  },

  tableWrapper:{
    overflowX:"auto",
    background:"#fff",
    borderRadius:"8px",
    border:"1px solid #e5e7eb"
  },

  table:{
    width:"100%",
    borderCollapse:"collapse",
    minWidth:"1700px",
    fontSize:"13px"
  }

};
