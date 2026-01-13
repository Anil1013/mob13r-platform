import { useEffect, useMemo, useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

/* ---------- IST DATE FORMATTER ---------- */
const formatIST = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

/* ---------- JSON SAFE VIEW ---------- */
const renderJSON = (data) => {
  if (!data) return "-";
  return (
    <pre style={{ maxHeight: 120, overflow: "auto" }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
};

export default function DumpDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ---------- FILTER STATES ---------- */
  const [msisdn, setMsisdn] = useState("");
  const [offer, setOffer] = useState("");
  const [publisher, setPublisher] = useState("");
  const [advertiser, setAdvertiser] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch(`${API_BASE}/api/dashboard/dump`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((json) => setRows(json.data || []))
      .catch((err) => {
        console.error("❌ Dump API error:", err);
        setError("Failed to load dump dashboard");
      })
      .finally(() => setLoading(false));
  }, []);

  /* ---------- FILTER LOGIC ---------- */
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
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
        if (new Date(r.created_ist) < new Date(fromDate)) return false;
      }

      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (new Date(r.created_ist) > end) return false;
      }

      return true;
    });
  }, [rows, msisdn, offer, publisher, advertiser, fromDate, toDate]);

  if (loading) return <p>Loading dump logs...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Main Dump Dashboard</h1>

      {/* ---------- FILTER BAR ---------- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 10,
          marginBottom: 15,
        }}
      >
        <input
          placeholder="MSISDN"
          value={msisdn}
          onChange={(e) => setMsisdn(e.target.value)}
        />
        <input
          placeholder="Offer"
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
        />
        <input
          placeholder="Publisher"
          value={publisher}
          onChange={(e) => setPublisher(e.target.value)}
        />
        <input
          placeholder="Advertiser"
          value={advertiser}
          onChange={(e) => setAdvertiser(e.target.value)}
        />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />
      </div>

      <button
        onClick={() => {
          setMsisdn("");
          setOffer("");
          setPublisher("");
          setAdvertiser("");
          setFromDate("");
          setToDate("");
        }}
        style={{ marginBottom: 15 }}
      >
        Clear Filters
      </button>

      {/* ---------- TABLE ---------- */}
      <div style={{ overflowX: "auto" }}>
        <table
          border="1"
          cellPadding="6"
          style={{ width: "100%", borderCollapse: "collapse" }}
        >
          <thead style={{ background: "#f3f3f3" }}>
            <tr>
              <th>Offer ID</th>
              <th>Publisher</th>
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
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan="12" align="center">
                  No records found
                </td>
              </tr>
            )}

            {filteredRows.map((r, i) => (
              <tr key={i}>
                <td>{r.offer_id}</td>
                <td>{r.publisher_name}</td>
                <td>{r.offer_name}</td>
                <td>{r.geo}</td>
                <td>{r.carrier}</td>
                <td>{r.msisdn}</td>
                <td>{renderJSON(r.publisher_request)}</td>
                <td>{renderJSON(r.publisher_response)}</td>
                <td>{renderJSON(r.advertiser_request)}</td>
                <td>{renderJSON(r.advertiser_response)}</td>
                <td>{r.status}</td>
                <td>{formatIST(r.created_ist)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 10 }}>
        Showing <b>{filteredRows.length}</b> of {rows.length} records
      </p>
    </div>
  );
}
