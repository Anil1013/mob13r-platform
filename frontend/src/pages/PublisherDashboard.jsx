import { useEffect, useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

export default function PublisherDashboard() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const publisherKey = localStorage.getItem("publisher_key");

  useEffect(() => {
    loadOffers();
    // eslint-disable-next-line
  }, []);

  const loadOffers = async () => {
    setLoading(true);

    const params = new URLSearchParams();
    if (fromDate) params.append("from", fromDate);
    if (toDate) params.append("to", toDate);

    try {
      const res = await fetch(
        `${API_BASE}/api/publisher/dashboard/offers?${params.toString()}`,
        {
          headers: {
            "x-publisher-key": publisherKey,
          },
        }
      );

      const data = await res.json();
      if (data.status === "SUCCESS") {
        setOffers(data.data || []);
      }
    } catch (err) {
      console.error("PUBLISHER DASHBOARD ERROR", err);
    }

    setLoading(false);
  };

  /* ================= CSV DOWNLOAD ================= */
  const downloadCSV = () => {
    if (!offers.length) return;

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
      "Last Pin Gen",
      "Last Pin Success",
      "Last Verify",
      "Last Success Verify",
    ];

    const rows = offers.map((o) => [
      o.offer_name,
      o.geo,
      o.carrier,
      o.cpa,
      o.cap,
      o.pin_requests,
      o.unique_pin_requests,
      o.pin_sent,
      o.unique_pin_sent,
      o.verify_requests,
      o.unique_verify_requests,
      o.verified,
      o.cr,
      o.revenue,
      o.last_pin_gen || "",
      o.last_pin_success || "",
      o.last_verify || "",
      o.last_success_verify || "",
    ]);

    let csv = headers.join(",") + "\n";
    rows.forEach((r) => {
      csv += r.join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "publisher_offers_report.csv";
    link.click();
  };

  return (
    <div style={{ padding: "16px 20px" }}>
      <h2>Publisher Dashboard</h2>

      {/* ================= FILTER BAR ================= */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <label>
          From:
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={input}
          />
        </label>

        <label>
          To:
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={input}
          />
        </label>

        <button onClick={loadOffers} style={btn}>
          Apply
        </button>

        <button onClick={downloadCSV} style={btnSecondary}>
          Download CSV
        </button>
      </div>

      {/* ================= TABLE ================= */}
      <div style={tableWrapper}>
        <table style={table}>
          <thead>
            <tr>
              <th style={{ ...th, ...sticky1 }}>Offer</th>
              <th style={{ ...th, ...sticky2 }}>Geo</th>
              <th style={{ ...th, ...sticky3 }}>Carrier</th>

              {[
                "CPA ($)",
                "Cap",
                "Pin Req",
                "Unique Req",
                "Pin Sent",
                "Unique Sent",
                "Verify Req",
                "Unique Verify",
                "Verified",
                "CR",
                "Revenue",
                "Last Pin Gen",
                "Last Pin Success",
                "Last Verify",
                "Last Success Verify",
              ].map((h) => (
                <th key={h} style={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan="18" style={tdCenter}>
                  Loading...
                </td>
              </tr>
            )}

            {!loading && !offers.length && (
              <tr>
                <td colSpan="18" style={tdCenter}>
                  No offers assigned
                </td>
              </tr>
            )}

            {offers.map((o, i) => (
              <tr key={i}>
                <td style={{ ...td, ...sticky1 }}>{o.offer_name}</td>
                <td style={{ ...td, ...sticky2 }}>{o.geo}</td>
                <td style={{ ...td, ...sticky3 }}>{o.carrier}</td>

                <td style={tdCenter}>${o.cpa}</td>
                <td style={tdCenter}>{o.cap}</td>
                <td style={tdCenter}>{o.pin_requests}</td>
                <td style={tdCenter}>{o.unique_pin_requests}</td>
                <td style={tdCenter}>{o.pin_sent}</td>
                <td style={tdCenter}>{o.unique_pin_sent}</td>
                <td style={tdCenter}>{o.verify_requests}</td>
                <td style={tdCenter}>{o.unique_verify_requests}</td>
                <td style={tdCenter}>{o.verified}</td>
                <td style={tdCenter}>{o.cr}%</td>
                <td style={tdCenter}>${o.revenue}</td>
                <td style={td}>{o.last_pin_gen || "-"}</td>
                <td style={td}>{o.last_pin_success || "-"}</td>
                <td style={td}>{o.last_verify || "-"}</td>
                <td style={td}>{o.last_success_verify || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const input = {
  marginLeft: 6,
  padding: 4,
};

const btn = {
  padding: "6px 12px",
  cursor: "pointer",
};

const btnSecondary = {
  ...btn,
  background: "#0ea5e9",
  color: "#fff",
  border: "none",
};

const tableWrapper = {
  width: "100%",
  overflowX: "auto",
  border: "1px solid #ccc",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const th = {
  border: "1px solid #ccc",
  padding: "8px",
  whiteSpace: "nowrap",
  background: "#f1f5f9",
  textAlign: "center",
};

const td = {
  border: "1px solid #ddd",
  padding: "6px",
  whiteSpace: "nowrap",
};

const tdCenter = {
  ...td,
  textAlign: "center",
};

/* Sticky columns */
const stickyBase = {
  position: "sticky",
  left: 0,
  background: "#fff",
  zIndex: 2,
};

const sticky1 = { ...stickyBase, left: 0 };
const sticky2 = { ...stickyBase, left: 160 };
const sticky3 = { ...stickyBase, left: 240 };
