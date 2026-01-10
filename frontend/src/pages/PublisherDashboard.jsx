import { useEffect, useRef, useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_BASE || "https://backend.mob13r.com";

/* ================= HELPERS ================= */

const formatDateOnly = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB");
};

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
  if (!date) return undefined;
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

  /* Date filters */
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  /* Text filters */
  const [offerFilter, setOfferFilter] = useState("");
  const [geoFilter, setGeoFilter] = useState("");
  const [carrierFilter, setCarrierFilter] = useState("");

  /* Auto refresh */
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef(null);

  /* Hourly modal */
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [hourlyRows, setHourlyRows] = useState([]);
  const [hourlyLoading, setHourlyLoading] = useState(false);

  /* ================= FETCH DASHBOARD ================= */

  const fetchData = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);

      const publisherKey = localStorage.getItem("publisher_key");
      if (!publisherKey) throw new Error("Publisher key missing");

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
      setSummary({});
    } finally {
      setLoading(false);
    }
  };

  /* ================= FETCH HOURLY ================= */

  const fetchHourly = async (row) => {
    try {
      setSelectedOffer(row);
      setHourlyLoading(true);
      setHourlyRows([]);

      const publisherKey = localStorage.getItem("publisher_key");

      const params = {
        from: fromDate ? dateInputToISO(fromDate) : undefined,
        to: toDate ? dateInputToISO(toDate, true) : undefined,
      };

      const query = new URLSearchParams(params).toString();

      const res = await fetch(
        `${API_BASE}/api/publisher/dashboard/offers/${row.publisher_offer_id}/hourly${
          query ? `?${query}` : ""
        }`,
        {
          headers: {
            "Content-Type": "application/json",
            "x-publisher-key": publisherKey,
          },
        }
      );

      if (!res.ok) throw new Error("Hourly API failed");

      const data = await res.json();
      setHourlyRows(data.rows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setHourlyLoading(false);
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

  /* ================= CSV ================= */

  const exportCSV = () => {
    const meta = [
      `Publisher: ${publisherName}`,
      `From: ${fromDate || "Today"}  To: ${toDate || "Today"}`,
      `Generated: ${new Date().toLocaleString()}`,
      "",
    ];

    const headers = [
      "Date",
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
      ...meta,
      headers.join(","),
      ...filteredRows.map((r) =>
        [
          formatDateOnly(r.stats_date),
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
    a.download = `${publisherName || "publisher"}_dashboard.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ================= CLIENT FILTER ================= */

  const filteredRows = rows.filter(
    (r) =>
      r.offer.toLowerCase().includes(offerFilter.toLowerCase()) &&
      r.geo.toLowerCase().includes(geoFilter.toLowerCase()) &&
      r.carrier.toLowerCase().includes(carrierFilter.toLowerCase())
  );

  /* ================= UI ================= */

  if (loading) return <p style={{ padding: 20 }}>Loading dashboard…</p>;
  if (error) return <p style={{ padding: 20, color: "red" }}>{error}</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Publisher Dashboard – {publisherName}</h2>

      {/* CONTROLS */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button onClick={() => fetchData(todayRange())}>Today</button>
        <button onClick={() => fetchData(yesterdayRange())}>Yesterday</button>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <button onClick={applyFilter}>Apply</button>
        <button onClick={exportCSV}>CSV</button>
        <label>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />{" "}
          Auto
        </label>
      </div>

      {/* TEXT FILTER */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input placeholder="Offer" value={offerFilter} onChange={(e) => setOfferFilter(e.target.value)} />
        <input placeholder="Geo" value={geoFilter} onChange={(e) => setGeoFilter(e.target.value)} />
        <input placeholder="Carrier" value={carrierFilter} onChange={(e) => setCarrierFilter(e.target.value)} />
      </div>

      {/* TABLE */}
      <table border="1" cellPadding="6" width="100%">
        <thead>
          <tr>
            <th>Date</th>
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
            <th>Last Pin Gen</th>
            <th>Last Pin Gen Success</th>
            <th>Last Verification</th>
            <th>Last Success Verification</th>
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((r) => (
            <tr key={`${r.publisher_offer_id}-${r.stats_date}`}>
              <td>{formatDateOnly(r.stats_date)}</td>
              <td>
                <button onClick={() => fetchHourly(r)}>{r.offer}</button>
              </td>
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
              <td>${r.revenue}</td>
              <td>{formatDateTime(r.last_pin_gen_date)}</td>
              <td>{formatDateTime(r.last_pin_gen_success_date)}</td>
              <td>{formatDateTime(r.last_pin_verification_date)}</td>
              <td>{formatDateTime(r.last_success_pin_verification_date)}</td>
            </tr>
          ))}

          {filteredRows.length > 0 && (
            <tr style={{ fontWeight: "bold", background: "#f3f4f6" }}>
              <td colSpan="6">TOTAL</td>
              <td>{summary.total_pin_requests}</td>
              <td colSpan="4"></td>
              <td>{summary.total_verified}</td>
              <td></td>
              <td>{summary.total_revenue}</td>
              <td colSpan="4"></td>
            </tr>
          )}
        </tbody>
      </table>

      {/* HOURLY MODAL */}
      {selectedOffer && (
        <div style={{ marginTop: 25 }}>
          <h3>
            Hourly – {selectedOffer.offer}
            <button onClick={() => setSelectedOffer(null)}> ✖</button>
          </h3>

          {hourlyLoading ? (
            <p>Loading…</p>
          ) : (
            <table border="1" cellPadding="6" width="100%">
              <thead>
                <tr>
                  <th>Hour</th>
                  <th>Unique Req</th>
                  <th>Unique Sent</th>
                  <th>Verify Req</th>
                  <th>Verified</th>
                  <th>Revenue ($)</th>
                </tr>
              </thead>
              <tbody>
                {hourlyRows.map((h, i) => (
                  <tr key={i}>
                    <td>{h.hour}</td>
                    <td>{h.unique_pin_requests}</td>
                    <td>{h.unique_pin_sent}</td>
                    <td>{h.unique_pin_verification_requests}</td>
                    <td>{h.pin_verified}</td>
                    <td>${h.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
