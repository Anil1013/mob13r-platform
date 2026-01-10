import { useEffect, useMemo, useRef, useState } from "react";

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
  const d = new Date();
  const from = new Date(d.setHours(0, 0, 0, 0)).toISOString();
  const to = new Date().toISOString();
  return { from, to };
};

const yesterdayRange = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const from = new Date(d.setHours(0, 0, 0, 0)).toISOString();
  const to = new Date(d.setHours(23, 59, 59, 999)).toISOString();
  return { from, to };
};

/* ================= COMPONENT ================= */

export default function PublisherDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* Filters */
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  /* Auto refresh */
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

      if (res.status === 401) {
        localStorage.removeItem("publisher_key");
        throw new Error("Unauthorized. Publisher key invalid.");
      }

      if (!res.ok) {
        throw new Error(`API Error ${res.status}`);
      }

      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("DASHBOARD LOAD ERROR:", err);
      setError(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  /* ================= INIT ================= */

  useEffect(() => {
    fetchData();
  }, []);

  /* ================= AUTO REFRESH ================= */

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchData(buildDateParams());
      }, 60000); // 60s
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line
  }, [autoRefresh, fromDate, toDate]);

  /* ================= DATE FILTER ================= */

  const buildDateParams = () => {
    const p = {};
    if (fromDate) p.from = fromDate;
    if (toDate) p.to = toDate;
    return p;
  };

  const applyFilter = () => {
    fetchData(buildDateParams());
  };

  /* ================= TOTALS ================= */

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.pinReq += Number(r.pin_request_count || 0);
        acc.verified += Number(r.unique_pin_verified || 0);
        acc.revenue += Number(r.revenue || 0);
        return acc;
      },
      { pinReq: 0, verified: 0, revenue: 0 }
    );
  }, [rows]);

  /* ================= EXPORT ================= */

  const exportCSV = () => {
    const headers = [
      "Offer",
      "Geo",
      "Carrier",
      "CPA",
      "Cap",
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
      headers.join(","),
      ...rows.map((r) =>
        [
          r.offer,
          r.geo,
          r.carrier,
          r.cpa,
          r.cap,
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

  if (error)
    return (
      <div style={{ padding: 20, color: "red" }}>
        <h3>Dashboard Error</h3>
        <p>{error}</p>
      </div>
    );

  return (
    <div style={{ padding: 20 }}>
      <h2>Publisher Dashboard</h2>

      {/* ===== CONTROLS ===== */}
      <div style={{ display: "flex", gap: 10, marginBottom: 15 }}>
        <button onClick={() => fetchData(todayRange())}>Today</button>
        <button onClick={() => fetchData(yesterdayRange())}>Yesterday</button>

        <input type="date" onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" onChange={(e) => setToDate(e.target.value)} />
        <button onClick={applyFilter}>Apply</button>

        <button onClick={exportCSV}>Export CSV</button>

        <label>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Auto refresh (60s)
        </label>
      </div>

      {/* ===== TABLE ===== */}
      <table border="1" cellPadding="8" width="100%">
        <thead>
          <tr>
            <th>Offer</th>
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

          {/* ===== TOTAL ROW ===== */}
          {rows.length > 0 && (
            <tr style={{ fontWeight: "bold", background: "#f3f4f6" }}>
              <td colSpan="5">TOTAL</td>
              <td>{totals.pinReq}</td>
              <td colSpan="4"></td>
              <td></td>
              <td>{totals.verified}</td>
              <td></td>
              <td>{totals.revenue}</td>
              <td colSpan="4"></td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
