import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

export default function PublisherDashboard() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const publisherKey = localStorage.getItem("publisher_key");

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/publisher/dashboard/offers`,
        {
          headers: {
            "x-publisher-key": publisherKey,
          },
        }
      );

      const data = await res.json();
      if (data.status === "SUCCESS") {
        setRows(data.data || []);
      }
    } catch (err) {
      console.error("DASHBOARD LOAD ERROR", err);
    }
    setLoading(false);
  };

  return (
    <>
      <Navbar />
      <div style={{ padding: 20 }}>
        <h2>Publisher Dashboard</h2>

        <div style={{ overflowX: "auto" }}>
          <table
            border="1"
            cellPadding="8"
            style={{ borderCollapse: "collapse", width: "100%" }}
          >
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
              {loading && (
                <tr>
                  <td colSpan="14" align="center">
                    Loading...
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan="14" align="center">
                    No offers assigned
                  </td>
                </tr>
              )}

              {rows.map((r) => (
                <tr
                  key={r.publisher_offer_id}
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    navigate(`/publisher/offers/${r.publisher_offer_id}`)
                  }
                >
                  <td>{r.offer}</td>
                  <td>{r.geo}</td>
                  <td>{r.carrier}</td>
                  <td>${r.cpa}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
