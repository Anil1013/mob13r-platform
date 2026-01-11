import { useEffect, useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

export default function DumpDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!API_BASE) {
      console.error("API_BASE missing");
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/dashboard/dump`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("API failed");
        return res.json();
      })
      .then((data) => {
        setRows(data.data || []);
      })
      .catch((err) => {
        console.error("Dump API error:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading dump logs...</p>;

  return (
    <div>
      <h1>Main Dump Dashboard</h1>

      <table border="1" cellPadding="6">
        <thead>
          <tr>
            <th>Offer ID</th>
            <th>Publisher</th>
            <th>Offer</th>
            <th>Geo</th>
            <th>Carrier</th>
            <th>MSISDN</th>
            <th>Publisher Req</th>
            <th>Publisher Res</th>
            <th>Advertiser Req</th>
            <th>Advertiser Res</th>
            <th>Status</th>
            <th>Date/Time (IST)</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.offer_id}</td>
              <td>{r.publisher_name}</td>
              <td>{r.offer_name}</td>
              <td>{r.geo}</td>
              <td>{r.carrier}</td>
              <td>{r.msisdn}</td>

              <td>
                <pre>{JSON.stringify(r.publisher_request, null, 2)}</pre>
              </td>
              <td>
                <pre>{JSON.stringify(r.publisher_response, null, 2)}</pre>
              </td>
              <td>
                <pre>{JSON.stringify(r.advertiser_request, null, 2)}</pre>
              </td>
              <td>
                <pre>{JSON.stringify(r.advertiser_response, null, 2)}</pre>
              </td>

              <td>{r.status}</td>
              <td>{r.created_ist}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
