import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import * as XLSX from "xlsx";

export default function Dashboard() {

  const user = JSON.parse(localStorage.getItem("user"));

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

        <h1>Mob13r Dashboard</h1>
        <p>Welcome <b>{user?.email}</b> 👋</p>

        {/* REALTIME STATS */}

        <div style={styles.stats}>

          <div style={styles.card}>
            Requests
            <h2>{stats.total_requests || 0}</h2>
          </div>

          <div style={styles.card}>
            OTP Sent
            <h2>{stats.otp_sent || 0}</h2>
          </div>

          <div style={styles.card}>
            Conversions
            <h2>{stats.conversions || 0}</h2>
          </div>

          <div style={styles.card}>
            Last Hour
            <h2>{stats.last_hour_requests || 0}</h2>
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
            Filter
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
    padding:"80px 40px 40px",
    fontFamily:"Inter, system-ui, Arial"
  },

  stats:{
    display:"flex",
    gap:"20px",
    marginBottom:"30px"
  },

  card:{
    padding:"15px 20px",
    background:"#f3f4f6",
    borderRadius:"10px"
  },

  filters:{
    marginBottom:"20px",
    display:"flex",
    gap:"10px",
    flexWrap:"wrap"
  },

  tableWrapper:{
    overflowX:"auto"
  },

  table:{
    width:"100%",
    borderCollapse:"collapse"
  }

};
