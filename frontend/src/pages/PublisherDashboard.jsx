import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

export default function PublisherDashboard() {
  const navigate = useNavigate();

  const [offers, setOffers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [searchOffer, setSearchOffer] = useState("");
  const [searchGeo, setSearchGeo] = useState("");

  const publisherKey = localStorage.getItem("publisher_key") || "";

  useEffect(() => {
    loadOffers();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    applySearch();
    // eslint-disable-next-line
  }, [searchOffer, searchGeo, offers]);

  /* ================= LOAD OFFERS ================= */
  const loadOffers = async () => {
    setLoading(true);

    const params = new URLSearchParams();
    if (fromDate) params.append("from", fromDate);
    if (toDate) params.append("to", toDate);

    try {
      const res = await fetch(
        `${API_BASE}/api/publisher/dashboard/offers?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-publisher-key": publisherKey,
          },
        }
      );

      if (!res.ok) {
        throw new Error("API failed");
      }

      const data = await res.json();

      if (data.status === "SUCCESS") {
        setOffers(data.data || []);
        setFiltered(data.data || []);
      } else {
        setOffers([]);
        setFiltered([]);
      }
    } catch (err) {
      console.error("PUBLISHER DASHBOARD ERROR", err);
      setOffers([]);
      setFiltered([]);
    }

    setLoading(false);
  };

  /* ================= SEARCH ================= */
  const applySearch = () => {
    let rows = [...offers];

    if (searchOffer) {
      rows = rows.filter((o) =>
        o.offer_name.toLowerCase().includes(searchOffer.toLowerCase())
      );
    }

    if (searchGeo) {
      rows = rows.filter((o) =>
        o.geo.toLowerCase().includes(searchGeo.toLowerCase())
      );
    }

    setFiltered(rows);
  };

  /* ================= CSV ================= */
  const downloadCSV = () => {
    if (!filtered.length) return;

    const headers = [
      "Offer",
      "Geo",
      "Carrier",
      "CPA",
      "Cap",
      "Pin Requests",
      "Unique Requests",
      "Pin Sent",
      "Unique Sent",
      "Verify Requests",
      "Unique Verify",
      "Verified",
      "CR",
      "Revenue",
    ];

    let csv = headers.join(",") + "\n";

    filtered.forEach((o) => {
      csv += [
        o.offer_name,
        o.geo,
        o.carrier,
        o.cpa,
        o.cap,
        o.pin_request_count,
        o.unique_pin_request_count,
        o.pin_send_count,
        o.unique_pin_sent,
        o.pin_validation_request_count,
        o.unique_pin_validation_request_count,
        o.unique_pin_verified,
        o.cr,
        o.revenue,
      ].join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "publisher_dashboard.csv";
    a.click();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Publisher Dashboard</h2>

      {/* FILTERS */}
      <div style={filters}>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />

        <button onClick={loadOffers}>Apply</button>
        <button onClick={downloadCSV} style={{ background: "#0ea5e9", color: "#fff" }}>
          Download CSV
        </button>

        <input
          placeholder="Search Offer"
          value={searchOffer}
          onChange={(e) => setSearchOffer(e.target.value)}
        />

        <input
          placeholder="Search Geo"
          value={searchGeo}
          onChange={(e) => setSearchGeo(e.target.value)}
        />
      </div>

      {/* TABLE */}
      <div style={wrapper}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Offer</th>
              <th style={th}>Geo</th>
              <th style={th}>Carrier</th>
              <th style={th}>CPA</th>
              <th style={th}>Cap</th>
              <th style={th}>Pin Req</th>
              <th style={th}>Unique Req</th>
              <th style={th}>Pin Sent</th>
              <th style={th}>Unique Sent</th>
              <th style={th}>Verify Req</th>
              <th style={th}>Unique Verify</th>
              <th style={th}>Verified</th>
              <th style={th}>Revenue</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan="13" style={center}>Loading...</td>
              </tr>
            )}

            {!loading && !filtered.length && (
              <tr>
                <td colSpan="13" style={center}>No offers assigned</td>
              </tr>
            )}

            {filtered.map((o) => (
              <tr
                key={o.offer_id}
                onClick={() => navigate(`/publisher/offers/${o.offer_id}`)}
                style={{ cursor: "pointer" }}
              >
                <td style={td}>{o.offer_name}</td>
                <td style={td}>{o.geo}</td>
                <td style={td}>{o.carrier}</td>
                <td style={center}>${o.cpa}</td>
                <td style={center}>{o.cap}</td>
                <td style={center}>{o.pin_request_count}</td>
                <td style={center}>{o.unique_pin_request_count}</td>
                <td style={center}>{o.pin_send_count}</td>
                <td style={center}>{o.unique_pin_sent}</td>
                <td style={center}>{o.pin_validation_request_count}</td>
                <td style={center}>{o.unique_pin_validation_request_count}</td>
                <td style={center}>{o.unique_pin_verified}</td>
                <td style={center}>${o.revenue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* STYLES */
const filters = { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 };
const wrapper = { overflowX: "auto", border: "1px solid #ccc" };
const table = { borderCollapse: "collapse", width: "100%", fontSize: 13 };
const th = { border: "1px solid #ccc", padding: 8, background: "#f1f5f9", textAlign: "center" };
const td = { border: "1px solid #ddd", padding: 6 };
const center = { ...td, textAlign: "center" };
