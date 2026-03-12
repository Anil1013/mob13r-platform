import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import * as XLSX from "xlsx";

export default function Dashboard() {

  const user = JSON.parse(localStorage.getItem("user"));

  const [data,setData] = useState([]);
  const [filtered,setFiltered] = useState([]);

  const [stats,setStats] = useState({});

  const [from,setFrom] = useState("");
  const [to,setTo] = useState("");
  const [operator,setOperator] = useState("");
  const [offer,setOffer] = useState("");

  const [search,setSearch] = useState("");

  const [page,setPage] = useState(1);
  const rowsPerPage = 10;

  const [sortField,setSortField] = useState("");
  const [sortAsc,setSortAsc] = useState(true);

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
    setFiltered(json.data || []);
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

  /* SEARCH */

  useEffect(()=>{

    const result = data.filter(row =>
      Object.values(row).join(" ").toLowerCase().includes(search.toLowerCase())
    );

    setFiltered(result);
    setPage(1);

  },[search,data]);

  /* SORT */

  const sortColumn = (field) => {

    const asc = field === sortField ? !sortAsc : true;

    const sorted = [...filtered].sort((a,b)=>{

      if(a[field] > b[field]) return asc ? 1 : -1;
      if(a[field] < b[field]) return asc ? -1 : 1;
      return 0;

    });

    setFiltered(sorted);
    setSortField(field);
    setSortAsc(asc);
  };

  /* PAGINATION */

  const start = (page-1)*rowsPerPage;
  const currentRows = filtered.slice(start,start+rowsPerPage);
  const totalPages = Math.ceil(filtered.length / rowsPerPage);

  /* EXPORT CSV */

  const exportCSV = () => {

    if(!data.length) return;

    const header = Object.keys(data[0]).join(",");
    const rows = data.map(row => Object.values(row).join(",")).join("\n");

    const csv = header + "\n" + rows;

    const blob = new Blob([csv],{type:"text/csv"});

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = "report.csv";
    a.click();
  };

  /* EXPORT EXCEL */

  const exportExcel = () => {

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb,ws,"Report");

    XLSX.writeFile(wb,"report.xlsx");
  };

  return (
    <>
      <Navbar />

      <div style={styles.container}>

        <h2>Dashboard</h2>
        <p>Welcome <b>{user?.email}</b></p>

        {/* STATS */}

        <div style={styles.cards}>

          <div style={styles.card}>
            Requests
            <h3>{stats.total_requests || 0}</h3>
          </div>

          <div style={styles.card}>
            OTP Sent
            <h3>{stats.otp_sent || 0}</h3>
          </div>

          <div style={styles.card}>
            Conversions
            <h3>{stats.conversions || 0}</h3>
          </div>

          <div style={styles.card}>
            Last Hour
            <h3>{stats.last_hour_requests || 0}</h3>
          </div>

        </div>

        {/* FILTERS */}

        <div style={styles.filters}>

          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} />
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} />

          <input
          placeholder="Operator"
          value={operator}
          onChange={e=>setOperator(e.target.value)}
          />

          <input
          placeholder="Offer ID"
          value={offer}
          onChange={e=>setOffer(e.target.value)}
          />

          <button onClick={loadReport}>Filter</button>

          <button onClick={exportCSV}>CSV</button>

          <button onClick={exportExcel}>Excel</button>

        </div>

        {/* SEARCH */}

        <input
        placeholder="Search..."
        style={styles.search}
        value={search}
        onChange={(e)=>setSearch(e.target.value)}
        />

        {/* TABLE */}

        <div style={styles.tableWrap}>

        <table style={styles.table}>

          <thead>

            <tr>

              {data[0] && Object.keys(data[0]).map(col => (

                <th key={col}
                onClick={()=>sortColumn(col)}
                style={{cursor:"pointer"}}
                >
                  {col}
                </th>

              ))}

            </tr>

          </thead>

          <tbody>

            {currentRows.map((row,i)=>(
              <tr key={i}>
                {Object.values(row).map((v,j)=>(
                  <td key={j}>{v}</td>
                ))}
              </tr>
            ))}

          </tbody>

        </table>

        </div>

        {/* PAGINATION */}

        <div style={styles.pagination}>

          <button
          disabled={page===1}
          onClick={()=>setPage(page-1)}
          >
            Prev
          </button>

          <span>Page {page} / {totalPages}</span>

          <button
          disabled={page===totalPages}
          onClick={()=>setPage(page+1)}
          >
            Next
          </button>

        </div>

      </div>
    </>
  );
}

const styles = {

  container:{
    padding:"80px 40px",
    fontFamily:"Inter, Arial"
  },

  cards:{
    display:"flex",
    gap:"20px",
    marginBottom:"30px"
  },

  card:{
    background:"#f4f6f8",
    padding:"20px",
    borderRadius:"10px",
    minWidth:"150px"
  },

  filters:{
    display:"flex",
    gap:"10px",
    marginBottom:"20px",
    flexWrap:"wrap"
  },

  search:{
    padding:"8px",
    marginBottom:"15px",
    width:"250px"
  },

  tableWrap:{
    overflowX:"auto"
  },

  table:{
    width:"100%",
    borderCollapse:"collapse"
  },

  pagination:{
    marginTop:"20px",
    display:"flex",
    gap:"20px",
    alignItems:"center"
  }

};
