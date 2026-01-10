import { useEffect, useMemo, useRef, useState } from "react";

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

  /* Date filters (CONTROLLED) */
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  /* Dropdown filters */
  const [offerFilter, setOfferFilter] = useState("");
  const [geoFilter, setGeoFilter] = useState("");
  const [carrierFilter, setCarrierFilter] = useState("");

  const intervalRef = useRef(null);

  /* ================= FETCH ================= */

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
            "Content-Type": "application/json",
            "x-publisher-key": publisherKey,
          },
        }
      );

      if (!res.ok) throw new Error(`API ${res.status}`);

      const data = await res.json();

      setRows(data.rows || []);
      setSummary(data.summary || {});
      setPublisherName(data.publisher?.name || "");
    } catch (err) {
      console.error(err);
      setError("Failed to load dashboard");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  /* ================= INIT ================= */

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    fetchData({
      from: today.toISOString(),
      to: new Date().toISOString(),
    });

    setFromDate(today.toISOString().slice(0, 10));
    setToDate(new Date().toISOString().slice(0, 10));
  }, []);

  /* ================= APPLY FILTER ================= */

  const applyFilter = () => {
    fetchData({
      from: fromDate ? dateInputToISO(fromDate) : undefined,
      to: toDate ? dateInputToISO(toDate, true) : undefined,
    });
  };

  /* ================= FILTERED ROWS ================= */

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (offerFilter && r.offer !== offerFilter) return false;
      if (geoFilter && r.geo !== geoFilter) return false;
      if (carrierFilter && r.carrier !== carrierFilter) return false;
      return true;
    });
  }, [rows, offerFilter, geoFilter, carrierFilter]);

  /* ================= CSV ================= */

  const exportCSV = () => {
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
      "Last Pin Gen Date",
      "Last Pin Gen Success Date",
      "Last Pin Verification Date",
      "Last Success Pin Verification Date",
    ];

    const csv = [
      `Publisher: ${publisherName}`,
      `From: ${fromDate || "-"}`,
      `To: ${toDate || "-"}`,
      "",
      headers.join(","),
      ...filteredRows.map((r) =>
        [
          r.offer,
          r.geo,
          r.carrier,
          r.cpa,
          r.cap,
          formatDateOnly(r.date || r.last_pin_gen_date),
          r.pin_request_count,
          r.unique_pin_request_count,
          r.pin_send_count,
          r.unique_pin_sent,
          r.pin_validation_request_count,
          r.unique_pin_validation_request_count,
          r.unique_pin_verified,
          r.cr,
          `$${r.revenue}`,
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
    a.download = `${publisherName}_dashboard.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ================= UI ================= */

  if (loading) return <p style={{ padding: 20 }}>Loading…</p>;
  if (error) return <p style={{ padding: 20, color: "red" }}>{error}</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>
        Publisher Dashboard{" "}
        <span style={{ color: "#2563eb" }}>{publisherName}</span>
      </h2>

      {/* CONTROLS */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
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
            <th>Last Pin Gen Date</th>
            <th>Last Pin Gen Success Date</th>
            <th>Last Pin Verification Date</th>
            <th>Last Success Pin Verification Date</th>
          </tr>
        </thead>

        <tbody>
          {filteredRows.map((r, i) => (
            <tr key={i}>
              <td>{r.offer}</td>
              <td>{r.geo}</td>
              <td>{r.carrier}</td>
              <td>{r.cpa}</td>
              <td>{r.cap}</td>
              <td>{formatDateOnly(r.date || r.last_pin_gen_date)}</td>
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

          <tr style={{ fontWeight: "bold", background: "#f3f4f6" }}>
            <td colSpan="6">TOTAL</td>
            <td>{summary.total_pin_requests}</td>
            <td colSpan="5"></td>
            <td>{summary.total_verified}</td>
            <td></td>
            <td>${summary.total_revenue}</td>
            <td colSpan="4"></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
