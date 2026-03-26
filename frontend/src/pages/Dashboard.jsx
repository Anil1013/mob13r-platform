import { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

const getTodayDateInput = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
};

const defaultFilters = {
  advertisers: [],
  publishers: [],
  geos: [],
  carriers: [],
  offers: [],
};

const formatDate = value => {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(parsed);
};

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const normalized = typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

export default function Dashboard() {
  const today = new Date().toISOString().slice(0, 10);

  const [data, setData] = useState([]);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const [advertiser, setAdvertiser] = useState("");
  const [publisher, setPublisher] = useState("");
  const [geo, setGeo] = useState("");
  const [carrier, setCarrier] = useState("");
  const [offer, setOffer] = useState("");

  const authHeader = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const getResponseData = useCallback(async response => {
    const json = await response.json();

    if (!response.ok) {
      throw new Error(json?.message || "Request failed");
    }

    return json;
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.append("from", from);
      params.append("to", to);

      if (advertiser) params.append("advertiser", advertiser);
      if (publisher) params.append("publisher", publisher);
      if (geo) params.append("geo", geo);
      if (carrier) params.append("carrier", carrier);
      if (offer) params.append("offer_id", offer);

      const response = await fetch(
        `${API_BASE}/api/dashboard/report?${params.toString()}`,
        { headers: authHeader }
      );
      const json = await getResponseData(response);

      setData(Array.isArray(json?.data) ? json.data : []);
    } catch (err) {
      setData([]);
      setError(err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [from, to, advertiser, publisher, geo, carrier, offer, authHeader, getResponseData]);

  const loadFilters = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/dashboard/filters`, {
        headers: authHeader,
      });
      const json = await getResponseData(response);

      setFilters({
        advertisers: Array.isArray(json?.advertisers) ? json.advertisers : [],
        publishers: Array.isArray(json?.publishers) ? json.publishers : [],
        geos: Array.isArray(json?.geos) ? json.geos : [],
        carriers: Array.isArray(json?.carriers) ? json.carriers : [],
        offers: Array.isArray(json?.offers) ? json.offers : [],
      });
    } catch {
      setFilters(defaultFilters);
    }
  }, [authHeader, getResponseData]);

  const loadRealtime = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/dashboard/realtime`, {
        headers: authHeader,
      });
      const json = await getResponseData(response);
      setStats(json?.data && typeof json.data === "object" ? json.data : {});
    } catch {
      setStats({});
    }
  }, [authHeader, getResponseData]);

  useEffect(() => {
    loadReport();
    loadFilters();
    loadRealtime();
  }, [loadReport, loadFilters, loadRealtime]);

  const exportCSV = () => {
    if (!data.length) {
      alert("No data to export");
      return;
    }

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(","),
      ...data.map(row => headers.map(header => csvCell(row[header])).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "traffic_report.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const total = useMemo(
    () =>
      data.reduce(
        (acc, row) => {
          acc.pin_req += Number(row.pin_req || 0);
          acc.unique_req += Number(row.unique_req || 0);
          acc.pin_sent += Number(row.pin_sent || 0);
          acc.unique_sent += Number(row.unique_sent || 0);
          acc.verify_req += Number(row.verify_req || 0);
          acc.unique_verify += Number(row.unique_verify || 0);
          acc.verified += Number(row.verified || 0);
          acc.revenue += Number(row.revenue || 0);
          return acc;
        },
        {
          pin_req: 0,
          unique_req: 0,
          pin_sent: 0,
          unique_sent: 0,
          verify_req: 0,
          unique_verify: 0,
          verified: 0,
          revenue: 0,
        }
      ),
    [data]
  );

  return (
    <>
      <Navbar />

      <div style={{ padding: "20px", fontFamily: "Lora, serif" }}>
        <h1>Traffic Dashboard</h1>

        {error ? <p style={{ color: "red" }}>{error}</p> : null}

        <div style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap" }}>
          <div style={{ background: "#e8f1ff", padding: "8px" }}>
            Requests <b>{stats.total_requests || 0}</b>
          </div>
          <div style={{ background: "#e7fff3", padding: "8px" }}>
            OTP Sent <b>{stats.otp_sent || 0}</b>
          </div>
          <div style={{ background: "#fff3e8", padding: "8px" }}>
            Conversions <b>{stats.conversions || 0}</b>
          </div>
          <div style={{ background: "#f3e8ff", padding: "8px" }}>
            Last Hour <b>{stats.last_hour_requests || 0}</b>
          </div>
        </div>

        <div style={{ marginBottom: "15px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          <input type="date" value={to} onChange={e => setTo(e.target.value)} />

          <select value={advertiser} onChange={e => setAdvertiser(e.target.value)}>
            <option value="">All Advertisers</option>
            {filters.advertisers.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <select value={publisher} onChange={e => setPublisher(e.target.value)}>
            <option value="">All Publishers</option>
            {filters.publishers.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <select value={geo} onChange={e => setGeo(e.target.value)}>
            <option value="">All Geo</option>
            {filters.geos.map(item => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select value={carrier} onChange={e => setCarrier(e.target.value)}>
            <option value="">All Carrier</option>
            {filters.carriers.map(item => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select value={offer} onChange={e => setOffer(e.target.value)}>
            <option value="">All Offers</option>
            {filters.offers.map(item => (
              <option key={item.id} value={item.id}>
                {item.offer_name}
              </option>
            ))}
          </select>

          <button onClick={loadReport} disabled={loading}>
            {loading ? "Loading..." : "Apply"}
          </button>

          <button onClick={exportCSV}>Export CSV</button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table border="1" cellPadding="8" width="100%" style={{ textAlign: "center" }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Advertiser</th>
                <th>Offer</th>
                <th>Publisher</th>
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
                <th>Last Verification</th>
                <th>Last Success Verification</th>
              </tr>
            </thead>

            <tbody>
              {data.map((row, i) => (
                <tr key={`${row.offer_id || "offer"}-${row.publisher_id || "pub"}-${i}`}>
                  <td>{formatDate(row.date)}</td>
                  <td>{row.advertiser_name}</td>
                  <td>{row.offer_name}</td>
                  <td>{row.publisher_name}</td>
                  <td>{row.geo}</td>
                  <td>{row.carrier}</td>
                  <td>{row.cpa}</td>
                  <td>{row.cap}</td>
                  <td>{row.pin_req}</td>
                  <td>{row.unique_req}</td>
                  <td>{row.pin_sent}</td>
                  <td>{row.unique_sent}</td>
                  <td>{row.verify_req}</td>
                  <td>{row.unique_verify}</td>
                  <td>{row.verified}</td>
                  <td>{row.cr_percent}</td>
                  <td>${Number(row.revenue || 0).toFixed(2)}</td>
                  <td>{formatDate(row.last_pin_gen)}</td>
                  <td>{formatDate(row.last_verification)}</td>
                  <td>{formatDate(row.last_success_verification)}</td>
                </tr>
              ))}

              <tr>
                <td colSpan="8">
                  <b>TOTAL</b>
                </td>
                <td>{total.pin_req}</td>
                <td>{total.unique_req}</td>
                <td>{total.pin_sent}</td>
                <td>{total.unique_sent}</td>
                <td>{total.verify_req}</td>
                <td>{total.unique_verify}</td>
                <td>{total.verified}</td>
                <td>-</td>
                <td>${total.revenue.toFixed(2)}</td>
                <td colSpan="3" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
