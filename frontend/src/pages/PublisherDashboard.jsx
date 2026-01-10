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

const formatHourRange = (value) => {
  const d = new Date(value);
  const h1 = d.getHours().toString().padStart(2, "0");
  const h2 = ((d.getHours() + 1) % 24).toString().padStart(2, "0");
  return `${h1}:00 – ${h2}:00`;
};

const todayRange = () => {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: new Date().toISOString() };
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

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [offerFilter, setOfferFilter] = useState("");
  const [geoFilter, setGeoFilter] = useState("");
  const [carrierFilter, setCarrierFilter] = useState("");

  const [selectedOffer, setSelectedOffer] = useState(null);
  const [hourlyRows, setHourlyRows] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const intervalRef = useRef(null);

  /* ================= FETCH MAIN ================= */

  const fetchData = async (params = {}) => {
    try {
      setLoading(true);
      const key = localStorage.getItem("publisher_key");
      const q = new URLSearchParams(params).toString();

      const res = await fetch(
        `${API_BASE}/api/publisher/dashboard/offers${q ? `?${q}` : ""}`,
        { headers: { "x-publisher-key": key } }
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

  /* ================= FETCH HOURLY ================= */

  const fetchHourly = async (row) => {
    setSelectedOffer(row);
    const key = localStorage.getItem("publisher_key");

    const q = new URLSearchParams({
      from: fromDate ? dateInputToISO(fromDate) : undefined,
      to: toDate ? dateInputToISO(toDate, true) : undefined,
    }).toString();

    const res = await fetch(
      `${API_BASE}/api/publisher/dashboard/offers/${row.publisher_offer_id}/hourly?${q}`,
      { headers: { "x-publisher-key": key } }
    );

    const data = await res.json();
    setHourlyRows(data.rows || []);
  };

  useEffect(() => {
    fetchData(todayRange());
  }, []);

  const applyFilter = () => {
    fetchData({
      from: fromDate ? dateInputToISO(fromDate) : undefined,
      to: toDate ? dateInputToISO(toDate, true) : undefined,
    });
  };

  /* ================= FILTERED ROWS ================= */

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      return (
        (!offerFilter ||
          r.offer.toLowerCase().includes(offerFilter.toLowerCase())) &&
        (!geoFilter ||
          r.geo.toLowerCase().includes(geoFilter.toLowerCase())) &&
        (!carrierFilter ||
          r.carrier.toLowerCase().includes(carrierFilter.toLowerCase()))
      );
    });
  }, [rows, offerFilter, geoFilter, carrierFilter]);

  /* ================= TOTALS ================= */

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (a, r) => {
        a.pin += Number(r.pin_request_count || 0);
        a.unique += Number(r.unique_pin_request_count || 0);
        a.sent += Number(r.pin_send_count || 0);
        a.verified += Number(r.unique_pin_verified || 0);
        a.revenue += Number(r.revenue || 0);
        return a;
      },
      { pin: 0, unique: 0, sent: 0, verified: 0, revenue: 0 }
    );
  }, [filteredRows]);

  if (loading) return <p>Loading…</p>;
  if (error) return <p>{error}</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>
        Publisher Dashboard –{" "}
        <span style={{ color: "#2563eb" }}>{publisherName}</span>
      </h2>

      {/* FILTERS */}
      <div style={{ marginBottom: 10 }}>
        <input type="date" onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" onChange={(e) => setToDate(e.target.value)} />
        <button onClick={applyFilter}>Apply</button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <input
          placeholder="Offer"
          value={offerFilter}
          onChange={(e) => setOfferFilter(e.target.value)}
        />
        <input
          placeholder="Geo"
          value={geoFilter}
          onChange={(e) => setGeoFilter(e.target.value)}
        />
        <input
          placeholder="Carrier"
          value={carrierFilter}
          onChange={(e) => setCarrierFilter(e.target.value)}
        />
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
            <th>Verified</th>
            <th>CR %</th>
            <th>Revenue ($)</th>
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((r) => (
            <tr key={r.publisher_offer_id}>
              <td>{formatDateOnly(fromDate || r.last_pin_gen_date)}</td>
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
              <td>{r.unique_pin_verified}</td>
              <td>{r.cr}%</td>
              <td>${r.revenue}</td>
            </tr>
          ))}

          <tr style={{ fontWeight: "bold" }}>
            <td colSpan="6">TOTAL</td>
            <td>{totals.pin}</td>
            <td>{totals.unique}</td>
            <td>{totals.sent}</td>
            <td></td>
            <td>{totals.verified}</td>
            <td></td>
            <td>${totals.revenue}</td>
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

          <table border="1" cellPadding="6" width="100%">
            <thead>
              <tr>
                <th>Hour</th>
                <th>Unique Req</th>
                <th>Unique Sent</th>
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
