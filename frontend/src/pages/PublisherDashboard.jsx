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
  const d = new Date(value);
  const h1 = d.getHours().toString().padStart(2, "0");
  const h2 = ((d.getHours() + 1) % 24).toString().padStart(2, "0");
  return `${h1}:00 – ${h2}:00`;
};

const toISOStart = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const toISOEnd = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
};

/* ================= COMPONENT ================= */

export default function PublisherDashboard() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [publisherName, setPublisherName] = useState("");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* Hourly */
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [hourlyRows, setHourlyRows] = useState([]);
  const [hourlyLoading, setHourlyLoading] = useState(false);

  /* ================= FETCH DASHBOARD ================= */

  const fetchDashboard = async (params = {}) => {
    try {
      setLoading(true);
      setError("");

      const key = localStorage.getItem("publisher_key");
      if (!key) throw new Error("Publisher key missing");

      const qs = new URLSearchParams(params).toString();

      const res = await fetch(
        `${API_BASE}/api/publisher/dashboard/offers${qs ? `?${qs}` : ""}`,
        {
          headers: { "x-publisher-key": key },
        }
      );

      const data = await res.json();

      setRows(data.rows || []);
      setSummary(data.summary || {});
      setPublisherName(data.publisher?.name || "");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  /* ================= FETCH HOURLY ================= */

  const fetchHourly = async (offer) => {
    try {
      setSelectedOffer(offer);
      setHourlyLoading(true);
      setHourlyRows([]);

      const key = localStorage.getItem("publisher_key");

      const params = {
        from: fromDate ? toISOStart(fromDate) : undefined,
        to: toDate ? toISOEnd(toDate) : undefined,
      };

      const qs = new URLSearchParams(params).toString();

      const res = await fetch(
        `${API_BASE}/api/publisher/dashboard/offers/${offer.publisher_offer_id}/hourly${
          qs ? `?${qs}` : ""
        }`,
        { headers: { "x-publisher-key": key } }
      );

      const data = await res.json();
      setHourlyRows(data.rows || []);
    } finally {
      setHourlyLoading(false);
    }
  };

  /* ================= INIT ================= */

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setFromDate(today);
    setToDate(today);
    fetchDashboard({ from: toISOStart(today), to: toISOEnd(today) });
  }, []);

  /* ================= APPLY FILTER ================= */

  const applyFilter = () => {
    if (!fromDate || !toDate) return;
    fetchDashboard({
      from: toISOStart(fromDate),
      to: toISOEnd(toDate),
    });
  };

  /* ================= TOTALS ================= */

  const totals = rows.reduce(
    (a, r) => {
      a.pinReq += Number(r.pin_request_count || 0);
      a.uniqueReq += Number(r.unique_pin_request_count || 0);
      a.pinSent += Number(r.pin_send_count || 0);
      a.uniqueSent += Number(r.unique_pin_sent || 0);
      a.verifyReq += Number(r.pin_validation_request_count || 0);
      a.uniqueVerify += Number(r.unique_pin_validation_request_count || 0);
      a.verified += Number(r.unique_pin_verified || 0);
      a.revenue += Number(r.revenue || 0);
      return a;
    },
    {
      pinReq: 0,
      uniqueReq: 0,
      pinSent: 0,
      uniqueSent: 0,
      verifyReq: 0,
      uniqueVerify: 0,
      verified: 0,
      revenue: 0,
    }
  );

  /* ================= UI ================= */

  if (loading) return <p style={{ padding: 20 }}>Loading…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>
        Publisher Dashboard –{" "}
        <span style={{ color: "#2563eb" }}>{publisherName}</span>
      </h2>

      {/* FILTER */}
      <div style={{ marginBottom: 10 }}>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <button onClick={applyFilter}>Apply</button>
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
            <th>Revenue ($)</th>
            <th>Last Pin Gen</th>
            <th>Last Pin Gen Success</th>
            <th>Last Verification</th>
            <th>Last Success Verification</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{formatDateOnly(r.date)}</td>
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

          {/* TOTAL */}
          <tr style={{ fontWeight: "bold", background: "#f3f4f6" }}>
            <td colSpan="6">TOTAL</td>
            <td>{totals.pinReq}</td>
            <td>{totals.uniqueReq}</td>
            <td>{totals.pinSent}</td>
            <td>{totals.uniqueSent}</td>
            <td>{totals.verifyReq}</td>
            <td>{totals.uniqueVerify}</td>
            <td>{totals.verified}</td>
            <td></td>
            <td>${totals.revenue}</td>
            <td colSpan="4"></td>
          </tr>
        </tbody>
      </table>

      {/* HOURLY */}
      {selectedOffer && (
        <div style={{ marginTop: 30 }}>
          <h3>
            Hourly – {selectedOffer.offer}
            <button onClick={() => setSelectedOffer(null)}>✖</button>
          </h3>

          {hourlyLoading ? (
            <p>Loading hourly…</p>
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
