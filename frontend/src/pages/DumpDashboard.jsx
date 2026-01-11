import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function DumpDashboard() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/dashboard/dump`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((r) => r.json())
      .then((d) => setRows(d.rows || []));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Main Dump Dashboard</h2>

      <table border="1" cellPadding="6" width="100%">
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
              <td>{r.offer}</td>
              <td>{r.geo}</td>
              <td>{r.carrier}</td>
              <td>{r.msisdn}</td>

              <td><pre>{JSON.stringify(r.publisher_request, null, 2)}</pre></td>
              <td><pre>{JSON.stringify(r.publisher_response, null, 2)}</pre></td>
              <td><pre>{JSON.stringify(r.advertiser_request, null, 2)}</pre></td>
              <td><pre>{JSON.stringify(r.advertiser_response, null, 2)}</pre></td>

              <td>{r.status}</td>
              <td>{r.created_ist}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
