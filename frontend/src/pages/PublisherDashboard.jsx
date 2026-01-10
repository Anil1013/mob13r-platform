import { useEffect, useRef, useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_BASE || "https://backend.mob13r.com";

/* ================= HELPERS ================= */

const formatDateOnly = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return d.toLocaleDateString("en-GB");
};

const formatDateTime = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-GB");
};

const formatHourRange = (value) => {
  if (!value) return "-";
  const start = new Date(value);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  const fmt = (d) =>
    d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return `${fmt(start)} – ${fmt(end)}`;
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
    total_unique_requests: 0,
    total_pin_sent: 0,
    total_unique_sent: 0,
    total_verify_requests: 0,
    total_verified: 0,
    total_revenue: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* filters */
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  /* hourly */
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
        `${API_BASE}/api/publisher/dashboard/offers${
          query ? `?${query}` : ""
        }`,
        {
          headers: {
            "x-publisher-key": publisherKey,
          },
        }
      );

      if (!res.ok) throw new Error("Dashboard API failed");

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

  /* ================= FETCH HOURLY ================= */

  const fetchHourly = async (row) => {
    try {
      setSelectedOffer(row);
      setHourlyLoading(true);
      setHourlyRows([]);

      const publisherKey = localStorage.getItem("publisher_key");

      const query = new URLSearchParams({
        from: fromDate ? dateInputToISO(fromDate) : undefined,
        to: toDate ? dateInputToISO(toDate, true) : undefined,
      }).toString();

      const res = await fetch(
        `${API_BASE}/api/publisher/dashboard/offers/${row.publisher_offer_id}/hourly${
          query ? `?${query}` : ""
        }`,
        {
          headers: {
            "x-publisher-key": publisherKey,
          },
        }
      );

      if (!res.ok) throw new Error("Hourly API failed");

      const data = await res.json();
      setHourlyRows(data.rows || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHourlyLoading(false);
    }
  };

  /* ================= INIT ================= */

  useEffect(() => {
    fetchData(todayRange());
  }, []);

  const applyFilter = () => {
    fetchData({
      from: fromDate ? dateInputToISO(fromDate) : undefined,
      to: toDate ? dateInputToISO(toDate, true) : undefined,
    });
  };

  /* ================= UI ================= */

  if (loading) return <p style={{ padding: 20 }}>Loading…</p>;

  if (error)
    return (
      <div style={{ padding: 20, color: "red" }}>
        <h3>Error</h3>
        <p>{error}</p>
      </div>
    );

  return (
    <div style={{ padding: 20 }}>
      <h2>
        Publisher Dashboard{" "}
        <span style={{ color: "#2563eb" }}>– {publisherName}</span>
      </h2>

      {/* FILTERS */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button onClick={() => fetchData(todayRange())}>Today</button>
        <button onClick={() => fetchData(yesterdayRange())}>Yesterday</button>

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

        <button onClick={applyFilter}>Apply</button>
      </div>

      {/* TABLE */}
      <table border="1" cellPadding="8" width="100%">
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
            <th>Revenue ($)</th>
            <th>Last Pin Gen</th>
            <th>Last Pin Gen Success</th>
            <th>Last Verification</th>
            <th>Last Success Verification</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr key={`${r.publisher_offer_id}-${r.stats_date}`}>
              <td>{formatDateOnly(r.stats_date)}</td>

              <td>
                <button
                  style={{
                    background: "none",
                    border: 0,
                    color: "blue",
                    cursor: "pointer",
                  }}
                  onClick={() => fetchHourly(r)}
                >
                  {r.offer}
                </button>
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

          {/* TOTAL */}
          <tr style={{ fontWeight: "bold", background: "#f3f4f6" }}>
            <td colSpan="6">TOTAL</td>
            <td>{summary.total_pin_requests}</td>
            <td>{summary.total_unique_requests}</td>
            <td>{summary.total_pin_sent}</td>
            <td>{summary.total_unique_sent}</td>
            <td>{summary.total_verify_requests}</td>
            <td></td>
            <td>{summary.total_verified}</td>
            <td></td>
            <td>${summary.total_revenue}</td>
            <td colSpan="4"></td>
          </tr>
        </tbody>
      </table>

      {/* HOURLY */}
      {selectedOffer && (
        <div style={{ marginTop: 30 }}>
          <h3>
            Hourly – {selectedOffer.offer}{" "}
            <button onClick={() => setSelectedOffer(null)}>✖</button>
          </h3>

          {hourlyLoading ? (
            <p>Loading hourly…</p>
          ) : (
            <table border="1" cellPadding="8" width="100%">
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
                    <td>{formatHourRange(h.hour)}</td>
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
