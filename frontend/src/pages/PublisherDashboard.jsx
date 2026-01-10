import { useEffect, useRef, useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_BASE || "https://backend.mob13r.com";

/* ================= HELPERS ================= */

const formatDateTime = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const todayRange = () => {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: new Date().toISOString() };
};

const yesterdayRange = () => {
  const from = new Date();
  from.setDate(from.getDate() - 1);
  from.setHours(0, 0, 0, 0);

  const to = new Date(from);
  to.setHours(23, 59, 59, 999);

  return { from: from.toISOString(), to: to.toISOString() };
};

const dateInputToISO = (date, isEnd = false) => {
  if (!date) return null;
  const d = new Date(date);
  if (isEnd) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

/* ================= COMPONENT ================= */

export default function PublisherDashboard() {
  const [rows, setRows] = useState([]);
  const [publisherName, setPublisherName] = useState("");
  const [summary, setSummary] = useState({
    total_pin_requests: 0,
    total_verified: 0,
    total_revenue: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef(null);

  /* ================= FETCH ================= */

  const fetchData = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);

      const publisherKey = localStorage.getItem("publisher_key");
      if (!publisherKey) {
        localStorage.removeItem("publisher_key");
        throw new Error("Publisher key missing. Please login again.");
      }

      const query = new URLSearchParams(params).toString();

      const res = await fetch(
        `${API_BASE}/api/publisher/dashboard/offers${query ? `?${query}` : ""}`,
        {
          headers: {
            "Content-Type": "application/json",
            "x-publisher-key": publisherKey,
          },
        }
      );

      if (!res.ok) throw new Error(`API Error ${res.status}`);

      const data = await res.json();
      setRows(data.rows || []);
      setSummary(data.summary || {});
      setPublisherName(data.publisher?.name || "");
    } catch (err) {
      setError(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  /* ================= INIT ================= */

  useEffect(() => {
    fetchData(todayRange());
  }, []);

  /* ================= AUTO REFRESH ================= */

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        applyFilter();
      }, 60000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, fromDate, toDate]);

  /* ================= FILTER ================= */

  const applyFilter = () => {
    fetchData({
      from: fromDate ? dateInputToISO(fromDate) : undefined,
      to: toDate ? dateInputToISO(toDate, true) : undefined,
    });
  };

  /* ================= EXPORT CSV ================= */

  const exportCSV = () => {
    const meta = [
      `Publisher: ${publisherName || "-"}`,
      `Generated At: ${new Date().toLocaleString()}`,
      "",
    ];

    const headers = [
      "Offer",
      "Geo",
      "Carrier",
      "CPA",
      "Cap",
      "Last Pin Date",
      "Pin Req",
      "Unique Req",
      "Pin Sent",
      "Unique Sent",
      "Verify Req",
      "Unique Verify",
      "Verified",
      "CR %",
      "Revenue",
      "Last Pin Gen Date",
      "Last Pin Gen Success Date",
      "Last Pin Verification Date",
      "Last Success Pin Verification Date",
    ];

    const csv = [
      ...meta,
      headers.join(","),
      ...rows.map((r) =>
        [
          r.offer,
          r.geo,
          r.carrier,
          r.cpa,
          r.cap,
          formatDateTime(r.last_pin_gen_date),
          r.pin_request_count,
          r.unique_pin_request_count,
          r.pin_send_count,
          r.unique_pin_sent,
          r.pin_validation_request_count,
          r.unique_pin_validation_request_count,
          r.unique_pin_verified,
          r.cr,
          r.revenue,
          formatDateTime(r.last_pin_gen_date),
          formatDateTime(r.last_pin_gen_success_date),
          formatDateTime(r.last_pin_verification_date),
          formatDateTime(r.last_success_pin_verification_date),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "publisher_dashboard.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ================= UI ================= */

  if (loading) return <p style={{ padding: 20 }}>Loading dashboard…</p>;
  if (error) return <p style={{ padding: 20, color: "red" }}>{error}</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>
        Publisher Dashboard{" "}
        <span style={{ color: "#2563eb" }}>{publisherName}</span>
      </h2>

      {/* CONTROLS */}
      <div style={{ display: "flex", gap: 10, marginBottom: 15 }}>
        <button onClick={() => fetchData(todayRange())}>Today</button>
        <button onClick={() => fetchData(yesterdayRange())}>Yesterday</button>
        <input type="date" onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" onChange={(e) => setToDate(e.target.value)} />
        <button onClick={applyFilter}>Apply</button>
        <button onClick={exportCSV}>Export CSV</button>
      </div>

      {/* TABLE */}
      <table border="1" cellPadding="8" width="100%">
        <thead>
          <tr>
            <th>Offer</th>
            <th>Geo</th>
            <th>Carrier</th>
            <th>CPA</th>
            <th>Cap</th>
            <th>Last Pin Date</th>
            <th>Pin Req</th>
            <th>Unique Req</th>
            <th>Pin Sent</th>
            <th>Unique Sent</th>
            <th>Verify Req</th>
            <th>Unique Verify</th>
            <th>Verified</th>
            <th>CR %</th>
            <th>Revenue</th>
            <th>Last Pin Gen Date</th>
            <th>Last Pin Gen Success Date</th>
            <th>Last Pin Verification Date</th>
            <th>Last Success Pin Verification Date</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr key={r.publisher_offer_id}>
              <td>{r.offer}</td>
              <td>{r.geo}</td>
              <td>{r.carrier}</td>
              <td>{r.cpa}</td>
              <td>{r.cap}</td>
              <td>{formatDateTime(r.last_pin_gen_date)}</td>
              <td>{r.pin_request_count}</td>
              <td>{r.unique_pin_request_count}</td>
              <td>{r.pin_send_count}</td>
              <td>{r.unique_pin_sent}</td>
              <td>{r.pin_validation_request_count}</td>
              <td>{r.unique_pin_validation_request_count}</td>
              <td>{r.unique_pin_verified}</td>
              <td>{r.cr}%</td>
              <td>{r.revenue}</td>
              <td>{formatDateTime(r.last_pin_gen_date)}</td>
              <td>{formatDateTime(r.last_pin_gen_success_date)}</td>
              <td>{formatDateTime(r.last_pin_verification_date)}</td>
              <td>{formatDateTime(r.last_success_pin_verification_date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
