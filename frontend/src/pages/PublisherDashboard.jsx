import { useEffect, useRef, useState, useMemo } from "react";

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

const formatDateOnly = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB");
};

const todayRange = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return { from: d.toISOString(), to: new Date().toISOString() };
};

const yesterdayRange = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  const to = new Date(d);
  to.setHours(23, 59, 59, 999);
  return { from: d.toISOString(), to: to.toISOString() };
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

  /* Filters */
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [offerFilter, setOfferFilter] = useState("");
  const [geoFilter, setGeoFilter] = useState("");
  const [carrierFilter, setCarrierFilter] = useState("");

  /* Auto refresh */
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef(null);

  /* Hourly */
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

      if (!res.ok) throw new Error("Failed to load dashboard");

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

  const fetchHourly = async (offer) => {
    try {
      setSelectedOffer(offer);
      setHourlyLoading(true);
      setHourlyRows([]);

      const publisherKey = localStorage.getItem("publisher_key");

      const params = {
        from: fromDate ? dateInputToISO(fromDate) : undefined,
        to: toDate ? dateInputToISO(toDate, true) : undefined,
      };

      const query = new URLSearchParams(params).toString();

      const res = await fetch(
        `${API_BASE}/api/publisher/dashboard/offers/${offer.publisher_offer_id}/hourly${
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

  /* ================= APPLY FILTER ================= */

  const applyFilter = () => {
    fetchData({
      from: fromDate ? dateInputToISO(fromDate) : undefined,
      to: toDate ? dateInputToISO(toDate, true) : undefined,
    });
  };

  /* ================= DATE-WISE GROUPING ================= */

  const dateWiseRows = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      const dateKey = formatDateOnly(r.last_pin_gen_date);
      const key = `${r.publisher_offer_id}_${dateKey}`;
      if (!map[key]) map[key] = { ...r, display_date: dateKey };
    });
    return Object.values(map);
  }, [rows]);

  /* ================= FILTERED ROWS ================= */

  const filteredRows = dateWiseRows.filter((r) => {
    if (offerFilter && r.offer !== offerFilter) return false;
    if (geoFilter && r.geo !== geoFilter) return false;
    if (carrierFilter && r.carrier !== carrierFilter) return false;
    return true;
  });

  /* ================= CSV EXPORT ================= */

  const exportCSV = () => {
    const meta = [
      `Publisher: ${publisherName}`,
      `Generated At: ${new Date().toLocaleString()}`,
      "",
    ];

    const headers = [
      "Offer",
      "Geo",
      "Carrier",
      "CPA",
      "Cap",
      "Date",
      "Pin Req",
      "Unique Req",
      "Pin Sent",
      "Unique Sent",
      "Verify Req",
      "Unique Verify",
      "Verified",
      "CR %",
      "Revenue",
    ];

    const csv = [
      ...meta,
      headers.join(","),
      ...filteredRows.map((r) =>
        [
          r.offer,
          r.geo,
          r.carrier,
          r.cpa,
          r.cap,
          r.display_date,
          r.pin_request_count,
          r.unique_pin_request_count,
          r.pin_send_count,
          r.unique_pin_sent,
          r.pin_validation_request_count,
          r.unique_pin_validation_request_count,
          r.unique_pin_verified,
          r.cr,
          r.revenue,
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

  /* ================= UI ================= */

  if (loading) return <p style={{ padding: 20 }}>Loading dashboard…</p>;
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
        <span style={{ color: "#2563eb" }}>{publisherName}</span>
      </h2>

      {/* CONTROLS */}
      <div style={{ display: "flex", gap: 8, marginBottom: 15 }}>
        <button onClick={() => fetchData(todayRange())}>Today</button>
        <button onClick={() => fetchData(yesterdayRange())}>Yesterday</button>

        <input type="date" onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" onChange={(e) => setToDate(e.target.value)} />
        <button onClick={applyFilter}>Apply</button>

        <select onChange={(e) => setOfferFilter(e.target.value)}>
          <option value="">All Offers</option>
          {[...new Set(rows.map((r) => r.offer))].map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>

        <select onChange={(e) => setGeoFilter(e.target.value)}>
          <option value="">All Geo</option>
          {[...new Set(rows.map((r) => r.geo))].map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>

        <select onChange={(e) => setCarrierFilter(e.target.value)}>
          <option value="">All Carrier</option>
          {[...new Set(rows.map((r) => r.carrier))].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

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
            <th>Date</th>
            <th>Pin Req</th>
            <th>Unique Req</th>
            <th>Pin Sent</th>
            <th>Unique Sent</th>
            <th>Verify Req</th>
            <th>Unique Verify</th>
            <th>Verified</th>
            <th>CR %</th>
            <th>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((r) => (
            <tr key={`${r.publisher_offer_id}_${r.display_date}`}>
              <td
                style={{ cursor: "pointer", color: "#2563eb" }}
                onClick={() => fetchHourly(r)}
              >
                {r.offer}
              </td>
              <td>{r.geo}</td>
              <td>{r.carrier}</td>
              <td>{r.cpa}</td>
              <td>{r.cap}</td>
              <td>{r.display_date}</td>
              <td>{r.pin_request_count}</td>
              <td>{r.unique_pin_request_count}</td>
              <td>{r.pin_send_count}</td>
              <td>{r.unique_pin_sent}</td>
              <td>{r.pin_validation_request_count}</td>
              <td>{r.unique_pin_validation_request_count}</td>
              <td>{r.unique_pin_verified}</td>
              <td>{r.cr}%</td>
              <td>${r.revenue}</td>
            </tr>
          ))}

          {filteredRows.length > 0 && (
            <tr style={{ fontWeight: "bold", background: "#f3f4f6" }}>
              <td colSpan="6">TOTAL</td>
              <td>{summary.total_pin_requests}</td>
              <td colSpan="5"></td>
              <td>{summary.total_verified}</td>
              <td></td>
              <td>${summary.total_revenue}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* HOURLY */}
      {selectedOffer && (
        <div style={{ marginTop: 30 }}>
          <h3>
            Hourly – {selectedOffer.offer}
            <button onClick={() => setSelectedOffer(null)}> ✖</button>
          </h3>

          {hourlyLoading ? (
            <p>Loading…</p>
          ) : (
            <table border="1" cellPadding="8" width="100%">
              <thead>
                <tr>
                  <th>Hour</th>
                  <th>Unique Req</th>
                  <th>Unique Sent</th>
                  <th>Unique Verify Req</th>
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
