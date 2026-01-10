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
  return new Date(value).toLocaleString("en-GB");
};

const hourLabel = (iso) => {
  const d = new Date(iso);
  const h1 = d.getHours().toString().padStart(2, "0");
  const h2 = ((d.getHours() + 1) % 24).toString().padStart(2, "0");
  return `${h1}:00 – ${h2}:00`;
};

const dateInputToISO = (date, end = false) => {
  const d = new Date(date);
  if (end) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

/* ================= COMPONENT ================= */

export default function PublisherDashboard() {
  const [rows, setRows] = useState([]);
  const [publisherName, setPublisherName] = useState("");
  const [summary, setSummary] = useState({});

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

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

      const qs = new URLSearchParams();
      if (fromDate) qs.append("from", dateInputToISO(fromDate));
      if (toDate) qs.append("to", dateInputToISO(toDate, true));

      const res = await fetch(
        `${API_BASE}/api/publisher/dashboard/offers?${qs}`,
        {
          headers: { "x-publisher-key": key },
        }
      );

      const data = await res.json();
      setRows(data.rows || []);
      setSummary(data.summary || {});
      setPublisherName(data.publisher?.name || "");
    } catch (e) {
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ================= FILTERED ROWS ================= */

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (
        filterOffer &&
        !r.offer.toLowerCase().includes(filterOffer.toLowerCase())
      )
        return false;
      if (
        filterGeo &&
        !r.geo.toLowerCase().includes(filterGeo.toLowerCase())
      )
        return false;
      if (
        filterCarrier &&
        !r.carrier.toLowerCase().includes(filterCarrier.toLowerCase())
      )
        return false;
      return true;
    });
  }, [rows, filterOffer, filterGeo, filterCarrier]);

  /* ================= TOTALS ================= */

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (a, r) => {
        a.pin += r.pin_request_count;
        a.uReq += r.unique_pin_request_count;
        a.sent += r.pin_send_count;
        a.uSent += r.unique_pin_sent;
        a.vReq += r.pin_validation_request_count;
        a.uVer += r.unique_pin_validation_request_count;
        a.ver += r.unique_pin_verified;
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
        <input type="date" onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" onChange={(e) => setToDate(e.target.value)} />
        <button onClick={fetchData}>Apply</button>

        <input
          placeholder="Offer"
          onChange={(e) => setFilterOffer(e.target.value)}
        />
        <input
          placeholder="Geo"
          onChange={(e) => setFilterGeo(e.target.value)}
        />
        <input
          placeholder="Carrier"
          onChange={(e) => setFilterCarrier(e.target.value)}
        />
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
              <td>
                <button onClick={() => openHourly(r)}>{r.offer}</button>
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

      {/* HOURLY MODAL */}
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
