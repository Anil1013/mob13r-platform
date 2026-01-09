import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function PublisherDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const publisherKey = localStorage.getItem("publisher_key");

      const res = await fetch(
        `${API_BASE}/api/publisher/dashboard/offers`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-publisher-key": publisherKey
          }
        }
      );

      if (!res.ok) throw new Error("Fetch failed");

      const data = await res.json();
      setRows(data);
    } catch (err) {
      console.error("DASHBOARD LOAD ERROR", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading...</p>;

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
              <td>{r.unique_pin_verified}</td>
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
