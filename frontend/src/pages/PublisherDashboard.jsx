import { useEffect, useMemo, useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_BASE || "https://backend.mob13r.com";

/* ================= HELPERS ================= */

// Backend already sends IST → render as string
const formatDateOnly = (value) => {
  if (!value) return "-";
  return value.toString().slice(0, 10).split("-").reverse().join("/");
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const [date, time] = value.replace("T", " ").split(".");
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}, ${time}`;
};

const hourLabel = (hourValue) => {
  if (!hourValue) return "-";
  const hour = hourValue.slice(11, 13);
  const next = String((Number(hour) + 1) % 24).padStart(2, "0");
  return `${hour}:00 – ${next}:00`;
};

// Date picker → ISO (IST safe)
const dateInputToISO = (date, end = false) => {
  const d = new Date(date);
  if (end) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

// CSV Export
const exportCSV = (rows) => {
  if (!rows.length) return;

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
    "Last Pin Gen",
    "Last Pin Gen Success",
    "Last Verification",
    "Last Success Verification",
  ];

  const csvRows = [
    headers.join(","),
    ...rows.map((r) =>
      [
        formatDateOnly(r.stat_date),
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

  const blob = new Blob([csvRows], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "publisher_dashboard.csv";
  a.click();
  window.URL.revokeObjectURL(url);
};

/* ================= COMPONENT ================= */

export default function PublisherDashboard() {
  const today = new Date().toISOString().slice(0, 10);

  const [rows, setRows] = useState([]);
  const [publisherName, setPublisherName] = useState("");
  const [summary, setSummary] = useState({});

  // 🔥 Default = TODAY
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const [filterOffer, setFilterOffer] = useState("");
  const [filterGeo, setFilterGeo] = useState("");
  const [filterCarrier, setFilterCarrier] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ===== HOURLY ===== */
  const [hourlyOpen, setHourlyOpen] = useState(false);
  const [hourlyRows, setHourlyRows] = useState([]);
  const [hourlyMeta, setHourlyMeta] = useState(null);

  /* ================= FETCH MAIN ================= */

  const fetchData = async () => {
    try {
      setLoading(true);
      const key = localStorage.getItem("publisher_key");

      const qs = new URLSearchParams({
        from: dateInputToISO(fromDate),
        to: dateInputToISO(toDate, true),
      });

      const res = await fetch(
        `${API_BASE}/api/publisher/dashboard/offers?${qs}`,
        { headers: { "x-publisher-key": key } }
      );

      const data = await res.json();
      setRows(data.rows || []);
      setSummary(data.summary || {});
      setPublisherName(data.publisher?.name || "");
    } catch {
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ================= FILTERED ================= */

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterOffer && !r.offer.toLowerCase().includes(filterOffer.toLowerCase()))
        return false;
      if (filterGeo && !r.geo.toLowerCase().includes(filterGeo.toLowerCase()))
        return false;
      if (filterCarrier && !r.carrier.toLowerCase().includes(filterCarrier.toLowerCase()))
        return false;
      return true;
    });
  }, [rows, filterOffer, filterGeo, filterCarrier]);

  /* ================= HOURLY ================= */

  const openHourly = async (row) => {
    const key = localStorage.getItem("publisher_key");

    const qs = new URLSearchParams({
      from: dateInputToISO(row.stat_date),
      to: dateInputToISO(row.stat_date, true),
    });

    const res = await fetch(
      `${API_BASE}/api/publisher/dashboard/offers/${row.publisher_offer_id}/hourly?${qs}`,
      { headers: { "x-publisher-key": key } }
    );

    const data = await res.json();
    setHourlyRows(data.rows || []);
    setHourlyMeta(row);
    setHourlyOpen(true);
  };

  /* ================= UI ================= */

  if (loading) return <p>Loading…</p>;
  if (error) return <p>{error}</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>
        Publisher Dashboard –{" "}
        <span style={{ color: "#2563eb" }}>{publisherName}</span>
      </h2>

      {/* FILTERS */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <button onClick={fetchData}>Apply</button>
        <button onClick={() => exportCSV(filteredRows)}>Export CSV</button>

        <input placeholder="Offer" onChange={(e) => setFilterOffer(e.target.value)} />
        <input placeholder="Geo" onChange={(e) => setFilterGeo(e.target.value)} />
        <input placeholder="Carrier" onChange={(e) => setFilterCarrier(e.target.value)} />
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
          {filteredRows.map((r, i) => (
            <tr key={i}>
              <td>{formatDateOnly(r.stat_date)}</td>
              <td><button onClick={() => openHourly(r)}>{r.offer}</button></td>
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
        </tbody>
      </table>

      {/* HOURLY */}
      {hourlyOpen && (
        <div style={{ marginTop: 30 }}>
          <h3>
            Hourly – {hourlyMeta.offer} ({formatDateOnly(hourlyMeta.stat_date)})
            <button onClick={() => setHourlyOpen(false)}> ❌</button>
          </h3>

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
                  <td>{hourLabel(h.hour)}</td>
                  <td>{h.unique_pin_requests}</td>
                  <td>{h.unique_pin_sent}</td>
                  <td>{h.unique_pin_verification_requests}</td>
                  <td>{h.pin_verified}</td>
                  <td>${h.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
