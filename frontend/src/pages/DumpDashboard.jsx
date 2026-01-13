import { useEffect, useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

/* ---------- IST DATE FORMATTER ---------- */
const formatIST = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

/* ---------- JSON SAFE VIEW ---------- */
const renderJSON = (data) => {
  if (!data) return "-";
  return <pre style={{ maxHeight: 150, overflow: "auto" }}>{JSON.stringify(data, null, 2)}</pre>;
};

export default function DumpDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch(`${API_BASE}/api/dashboard/dump`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "API failed");
        }
        return res.json();
      })
      .then((json) => {
        setRows(json.data || []);
      })
      .catch((err) => {
        console.error("❌ Dump API error:", err);
        setError("Failed to load dump dashboard");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading dump logs...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Main Dump Dashboard</h1>

      <div style={{ overflowX: "auto" }}>
        <table
          border="1"
          cellPadding="6"
          style={{ width: "100%", borderCollapse: "collapse" }}
        >
          <thead style={{ background: "#f3f3f3" }}>
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
              <th>Date / Time (IST)</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan="12" align="center">
                  No dump records found
                </td>
              </tr>
            )}

            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.offer_id}</td>
                <td>{r.publisher_name}</td>
                <td>{r.offer_name}</td>
                <td>{r.geo}</td>
                <td>{r.carrier}</td>
                <td>{r.msisdn}</td>

                <td>{renderJSON(r.publisher_request)}</td>
                <td>{renderJSON(r.publisher_response)}</td>
                <td>{renderJSON(r.advertiser_request)}</td>
                <td>{renderJSON(r.advertiser_response)}</td>

                <td>{r.status}</td>
                <td>{formatIST(r.created_ist)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
