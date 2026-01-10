import { useEffect, useMemo, useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_BASE || "https://backend.mob13r.com";

/* ================= HELPERS ================= */

const safeFileName = (name = "publisher") =>
  name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");

const formatDateOnly = (value) => {
  if (!value) return "-";
  const [y, m, d] = value.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  let v = value.replace("T", " ").replace("Z", "").split(".")[0];
  const [date, time] = v.split(" ");
  if (!date || !time) return "-";
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}, ${time}`;
};

const hourLabel = (hourValue) => {
  if (!hourValue) return "-";
  const h = hourValue.slice(11, 13);
  const n = String((Number(h) + 1) % 24).padStart(2, "0");
  return `${h}:00 – ${n}:00`;
};

const dateInputToISO = (date, end = false) => {
  const d = new Date(date);
  if (end) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

/* ================= CSV EXPORT ================= */

const exportCSV = (rows, fromDate, toDate, publisherName) => {
  if (!rows.length) {
    alert("No data to export");
    return;
  }

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
        `"${r.offer}"`,
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

  const blob = new Blob([csvRows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const filename = `${safeFileName(
    publisherName
  )}_${fromDate}_to_${toDate}.csv`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
};

/* ================= COMPONENT ================= */

export default function PublisherDashboard() {
  const today = new Date().toISOString().slice(0, 10);

  const [rows, setRows] = useState([]);
  const [publisherName, setPublisherName] = useState("");

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const [filterOffer, setFilterOffer] = useState("");
  const [filterGeo, setFilterGeo] = useState("");
  const [filterCarrier, setFilterCarrier] = useState("");

  const [loading, setLoading] = useState(true);

  /* ===== HOURLY ===== */
  const [hourlyOpen, setHourlyOpen] = useState(false);
  const [hourlyRows, setHourlyRows] = useState([]);
  const [hourlyMeta, setHourlyMeta] = useState(null);

  /* ================= FETCH ================= */

  const fetchData = async () => {
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
    setPublisherName(data.publisher?.name || "");
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ================= FILTERS ================= */

  const offerOptions = [...new Set(rows.map((r) => r.offer))];
  const geoOptions = [...new Set(rows.map((r) => r.geo))];
  const carrierOptions = [...new Set(rows.map((r) => r.carrier))];

  const filteredRows = rows.filter((r) => {
    if (filterOffer && r.offer !== filterOffer) return false;
    if (filterGeo && r.geo !== filterGeo) return false;
    if (filterCarrier && r.carrier !== filterCarrier) return false;
    return true;
  });

  /* ================= TOTALS ================= */

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (a, r) => {
        a.pin += Number(r.pin_request_count || 0);
        a.uReq += Number(r.unique_pin_request_count || 0);
        a.sent += Number(r.pin_send_count || 0);
        a.uSent += Number(r.unique_pin_sent || 0);
        a.vReq += Number(r.pin_validation_request_count || 0);
        a.uVer += Number(r.unique_pin_validation_request_count || 0);
        a.ver += Number(r.unique_pin_verified || 0);
        a.rev += Number(r.revenue || 0);
        return a;
      },
      {
        pin: 0,
        uReq: 0,
        sent: 0,
        uSent: 0,
        vReq: 0,
        uVer: 0,
        ver: 0,
        rev: 0,
      }
    );
  }, [filteredRows]);

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

  if (loading) return <p style={{ padding: 20 }}>Loading…</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>
        Publisher Dashboard –{" "}
        <span style={{ color: "#2563eb" }}>{publisherName}</span>
      </h2>

      {/* FILTER BAR – SAME AS ORIGINAL */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <button onClick={fetchData}>Apply</button>

        <button
          onClick={() =>
            exportCSV(filteredRows, fromDate, toDate, publisherName)
          }
        >
          Export CSV
        </button>

        <select value={filterOffer} onChange={(e) => setFilterOffer(e.target.value)}>
          <option value="">All Offers</option>
          {offerOptions.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>

        <select value={filterGeo} onChange={(e) => setFilterGeo(e.target.value)}>
          <option value="">All Geo</option>
          {geoOptions.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>

        <select value={filterCarrier} onChange={(e) => setFilterCarrier(e.target.value)}>
          <option value="">All Carrier</option>
          {carrierOptions.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* MAIN TABLE – CENTER ALIGNED */}
      <table
        border="1"
        cellPadding="8"
        width="100%"
        style={{ textAlign: "center" }}
      >
        <thead>
          <tr>
            {[
              "Date","Offer","Geo","Carrier","CPA","Cap",
              "Pin Req","Unique Req","Pin Sent","Unique Sent",
              "Verify Req","Unique Verify","Verified","CR %",
              "Revenue","Last Pin Gen","Last Pin Gen Success",
              "Last Verification","Last Success Verification",
            ].map((h) => (
              <th key={h} style={{ textAlign: "center" }}>{h}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {filteredRows.map((r, i) => (
            <tr key={i}>
              <td>{formatDateOnly(r.stat_date)}</td>
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
              <td>${r.revenue}</td>
              <td>{formatDateTime(r.last_pin_gen_date)}</td>
              <td>{formatDateTime(r.last_pin_gen_success_date)}</td>
              <td>{formatDateTime(r.last_pin_verification_date)}</td>
              <td>{formatDateTime(r.last_success_pin_verification_date)}</td>
            </tr>
          ))}

          {/* TOTAL ROW */}
          <tr style={{ fontWeight: "bold", background: "#f3f4f6" }}>
            <td colSpan="6">TOTAL</td>
            <td>{totals.pin}</td>
            <td>{totals.uReq}</td>
            <td>{totals.sent}</td>
            <td>{totals.uSent}</td>
            <td>{totals.vReq}</td>
            <td>{totals.uVer}</td>
            <td>{totals.ver}</td>
            <td></td>
            <td>${totals.rev}</td>
            <td colSpan="4"></td>
          </tr>
        </tbody>
      </table>

      {/* HOURLY TABLE – ALSO CENTER */}
      {hourlyOpen && (
        <div style={{ marginTop: 25 }}>
          <h3>
            Hourly – {hourlyMeta.offer} ({formatDateOnly(hourlyMeta.stat_date)})
            <button onClick={() => setHourlyOpen(false)}> ❌</button>
          </h3>

          <table
            border="1"
            cellPadding="8"
            width="100%"
            style={{ textAlign: "center" }}
          >
            <thead>
              <tr>
                {[
                  "Hour",
                  "Unique Req",
                  "Unique Sent",
                  "Verify Req",
                  "Verified",
                  "Revenue ($)",
                ].map((h) => (
                  <th key={h} style={{ textAlign: "center" }}>{h}</th>
                ))}
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
