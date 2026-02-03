import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";

/* ================= CONFIG ================= */
const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

/* ================= CSV EXPORT ================= */
function exportCSV(rows) {
  if (!rows.length) return alert("No data to export");

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(r =>
      headers.map(h => `"${JSON.stringify(r[h] ?? "").replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `dump_${Date.now()}.csv`;
  link.click();
}

/* ================= EXCEL EXPORT ================= */
function exportExcel(rows) {
  if (!rows.length) return alert("No data to export");

  import("xlsx").then(XLSX => {
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Dump");
    XLSX.writeFile(book, `dump_${Date.now()}.xlsx`);
  });
}

/* ================= JSON VIEW ================= */
const renderJSON = data => (
  <pre style={{ maxHeight: 130, overflow: "auto" }}>
    {data ? JSON.stringify(data, null, 2) : "-"}
  </pre>
);

export default function DumpDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= FILTER STATES ================= */
  const [msisdn, setMsisdn] = useState("");
  const [offer, setOffer] = useState("");
  const [publisher, setPublisher] = useState("");
  const [advertiser, setAdvertiser] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  /* ================= FETCH ================= */
  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch(`${API_BASE}/api/dashboard/dump`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(json => setRows(json.data || []))
      .catch(() => setError("Failed to load dump"))
      .finally(() => setLoading(false));
  }, []);

  /* ================= FILTER LOGIC ================= */
  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (msisdn && !r.msisdn?.includes(msisdn)) return false;
      if (offer && !r.offer_name?.toLowerCase().includes(offer.toLowerCase()))
        return false;
      if (
        publisher &&
        !r.publisher_name?.toLowerCase().includes(publisher.toLowerCase())
      )
        return false;
      if (
        advertiser &&
        !r.advertiser_name?.toLowerCase().includes(advertiser.toLowerCase())
      )
        return false;

      if (fromDate) {
        if (new Date(r.created_ist.split(",")[0].split("/").reverse().join("-")) < new Date(fromDate))
          return false;
      }

      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (new Date(r.created_ist.split(",")[0].split("/").reverse().join("-")) > end)
          return false;
      }

      return true;
    });
  }, [rows, msisdn, offer, publisher, advertiser, fromDate, toDate]);

  if (loading) return <p>Loading dump logs…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Main Dump Dashboard</h1>

      {/* ================= FILTER BAR ================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <input placeholder="MSISDN" value={msisdn} onChange={e => setMsisdn(e.target.value)} />
        <input placeholder="Offer" value={offer} onChange={e => setOffer(e.target.value)} />
        <input placeholder="Publisher" value={publisher} onChange={e => setPublisher(e.target.value)} />
        <input placeholder="Advertiser" value={advertiser} onChange={e => setAdvertiser(e.target.value)} />
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
      </div>

      {/* ================= ACTIONS ================= */}
      <div style={{ marginBottom: 15 }}>
        <button onClick={() => {
          setMsisdn(""); setOffer(""); setPublisher("");
          setAdvertiser(""); setFromDate(""); setToDate("");
        }}>
          Clear Filters
        </button>{" "}
        <button onClick={() => exportCSV(filteredRows)}>Export CSV</button>{" "}
        <button onClick={() => exportExcel(filteredRows)}>Export Excel</button>
      </div>

      {/* ================= TABLE ================= */}
      <div style={{ overflowX: "auto" }}>
        <table border="1" cellPadding="6" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>Offer ID</th>
              <th>Publisher</th>
              <th>Advertiser</th>
              <th>Offer</th>
              <th>Geo</th>
              <th>Carrier</th>
              <th>MSISDN</th>
              <th>Publisher Req</th>
              <th>Publisher Res</th>
              <th>Advertiser Req</th>
              <th>Advertiser Res</th>
              <th>Status</th>
              <th>Date / Time (IST)</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r, i) => (
              <tr key={i}>
                <td>{r.offer_id}</td>
                <td>{r.publisher_name}</td>
                <td>{r.advertiser_name}</td>
                <td>{r.offer_name}</td>
                <td>{r.geo}</td>
                <td>{r.carrier}</td>
                <td>{r.msisdn}</td>
                <td>{renderJSON(r.publisher_request)}</td>
                <td>{renderJSON(r.publisher_response)}</td>
                <td>{renderJSON(r.advertiser_request)}</td>
                <td>{renderJSON(r.advertiser_response)}</td>
                <td>{r.status}</td>
                <td>{r.created_ist}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 10 }}>
        Showing <b>{filteredRows.length}</b> of {rows.length}
      </p>
    </div>
  );
}
