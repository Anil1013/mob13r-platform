import { useEffect, useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_BASE || "https://backend.mob13r.com";

export default function PublisherDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      /* ✅ ONLY publisher_key is required */
      const publisherKey = localStorage.getItem("publisher_key");

      if (!publisherKey) {
        throw new Error("Publisher key missing. Please login again.");
      }

      const res = await fetch(
        `${API_BASE}/api/publisher/dashboard/offers`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-publisher-key": publisherKey,
          },
        }
      );

      if (res.status === 401) {
        throw new Error("Unauthorized: Invalid publisher key");
      }

      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
      }

      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("DASHBOARD LOAD ERROR:", err);
      setError(err.message || "Failed to load dashboard");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- UI STATES ---------------- */

  if (loading) {
    return <p style={{ padding: 20 }}>Loading dashboard…</p>;
  }

  if (error) {
    return (
      <div style={{ padding: 20, color: "red" }}>
        <h3>Dashboard Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  /* ---------------- MAIN UI ---------------- */

  return (
    <div style={{ padding: "20px" }}>
      <h2>Publisher Dashboard</h2>

      <table border="1" cellPadding="8" cellSpacing="0" width="100%">
        <thead>
          <tr>
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
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan="14" align="center">
                No offers assigned
              </td>
            </tr>
          )}

          {rows.map((r) => (
            <tr key={r.publisher_offer_id}>
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
              <td>{r.revenue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
