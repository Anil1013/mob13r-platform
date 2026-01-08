import { useEffect, useState } from "react";
import DataTable from "react-data-table-component";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

export default function PublisherDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);

    const res = await fetch(
      `${API_BASE}/api/publisher/dashboard/offers`,
      {
        headers: {
          "x-publisher-key": localStorage.getItem("publisher_key"),
        },
      }
    );

    const json = await res.json();
    setRows(json.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    { name: "Offer", selector: r => r.offer_name },
    { name: "Geo", selector: r => r.geo },
    { name: "Carrier", selector: r => r.carrier },
    { name: "CPA", selector: r => r.cpa },
    { name: "Cap", selector: r => r.cap },
    { name: "Pin Req", selector: r => r.pin_requests },
    { name: "Unique Req", selector: r => r.unique_pin_requests },
    { name: "Pin Sent", selector: r => r.pin_sent },
    { name: "Unique Sent", selector: r => r.unique_pin_sent },
    { name: "Verify Req", selector: r => r.verify_requests },
    { name: "Unique Verify", selector: r => r.unique_verify_requests },
    { name: "Verified", selector: r => r.verified },
    { name: "Revenue", selector: r => r.revenue },
  ];

  return (
    <div style={{ padding: 20 }}>
      <h2>Publisher Dashboard</h2>

      <DataTable
        columns={columns}
        data={rows}
        progressPending={loading}
        pagination
        highlightOnHover
        responsive
      />
    </div>
  );
}
