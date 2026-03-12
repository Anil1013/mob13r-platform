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

        {/* SMALL COLORED STATS */}

        <div style={styles.stats}>

          <div style={{...styles.card,background:"#e8f1ff"}}>
            Requests
            <strong>{stats.total_requests || 0}</strong>
          </div>

          <div style={{...styles.card,background:"#e6fff3"}}>
            OTP Sent
            <strong>{stats.otp_sent || 0}</strong>
          </div>

          <div style={{...styles.card,background:"#fff5e6"}}>
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

        {/* EXCEL STYLE TABLE */}

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
              <th>%</th>
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
    padding:"25px",
    fontFamily:"Arial"
  },

  stats:{
    display:"flex",
    gap:"10px",
    marginBottom:"10px"
  },

  card:{
    padding:"8px 14px",
    borderRadius:"6px",
    fontSize:"13px",
    display:"flex",
    flexDirection:"column"
  },

  filters:{
    display:"flex",
    gap:"8px",
    marginBottom:"10px",
    flexWrap:"wrap"
  },

  tableWrapper:{
    overflowX:"auto",
    border:"1px solid #999"
  },

  table:{
    borderCollapse:"collapse",
    width:"100%",
    fontSize:"12px"
  }

};
