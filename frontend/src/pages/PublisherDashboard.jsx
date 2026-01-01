import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://backend.mob13r.com";

export default function PublisherDashboard() {
  const [summary, setSummary] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [summaryRes, offersRes] = await Promise.all([
        fetch(`${API_BASE}/api/publisher/dashboard/summary`, { headers }),
        fetch(`${API_BASE}/api/publisher/dashboard/offers`, { headers }),
      ]);

      const summaryData = await summaryRes.json();
      const offersData = await offersRes.json();

      if (summaryData.status === "SUCCESS") {
        setSummary(summaryData.data);
      }

      if (offersData.status === "SUCCESS") {
        setOffers(offersData.data);
      }
    } catch (err) {
      console.error("PUBLISHER DASHBOARD ERROR", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div style={{ padding: 40 }}>Loading dashboard…</div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div style={styles.page}>
        <h2>Publisher Dashboard</h2>

        {/* ================= SUMMARY CARDS ================= */}
        {summary && (
          <div style={styles.cards}>
            <Card title="Pin Requests" value={summary.total_pin_requests} />
            <Card
              title="Unique Requests"
              value={summary.unique_pin_requests}
            />
            <Card title="Pin Sent" value={summary.total_pin_sent} />
            <Card
              title="Unique Sent"
              value={summary.unique_pin_sent}
            />
            <Card
              title="Verified"
              value={summary.pin_verified}
            />
            <Card title="CR" value={summary.CR} />
            <Card title="Revenue" value={summary.revenue} />
          </div>
        )}

        {/* ================= OFFERS TABLE ================= */}
        <h3 style={{ marginTop: 30 }}>Offers Performance</h3>

        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {[
                  "Offer",
                  "Geo",
                  "Carrier",
                  "CPA ($)",
                  "Cap",
                  "Pin Requests",
                  "Unique Requests",
                  "Pin Sent",
                  "Unique Sent",
                  "Verify Requests",
                  "Unique Verify Req",
                  "Verified",
                  "CR",
                  "Revenue",
                  "Last Pin Gen",
                  "Last Pin Success",
                  "Last Verify",
                  "Last Success Verify",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {offers.map((o, idx) => (
                <tr key={idx}>
                  <td>{o.offer}</td>
                  <td>{o.geo}</td>
                  <td>{o.carrier}</td>
                  <td>{o.cpa}</td>
                  <td>{o.cap ?? "∞"}</td>

                  <td>{o.pin_request_count}</td>
                  <td>{o.unique_pin_request_count}</td>

                  <td>{o.pin_send_count}</td>
                  <td>{o.unique_pin_sent}</td>

                  <td>{o.pin_validation_request_count}</td>
                  <td>{o.unique_pin_validation_request_count}</td>

                  <td>{o.unique_pin_verified}</td>
                  <td>{o.CR}</td>
                  <td>{o.revenue}</td>

                  <td>{formatDate(o.last_pin_gen_date)}</td>
                  <td>{formatDate(o.last_pin_gen_success_date)}</td>
                  <td>{formatDate(o.last_pin_verification_date)}</td>
                  <td>{formatDate(o.last_success_pin_verification_date)}</td>
                </tr>
              ))}

              {!offers.length && (
                <tr>
                  <td colSpan="18" style={{ textAlign: "center" }}>
                    No offers assigned
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ================= SMALL COMPONENTS ================= */

function Card({ title, value }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>{title}</div>
      <div style={styles.cardValue}>{value}</div>
    </div>
  );
}

function formatDate(val) {
  if (!val) return "-";
  return new Date(val).toLocaleString();
}

/* ================= STYLES ================= */

const styles = {
  page: {
    padding: "70px 30px",
    fontFamily: "Inter, system-ui, Arial",
  },

  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 16,
    marginTop: 20,
  },

  card: {
    background: "#fff",
    borderRadius: 8,
    padding: 16,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    textAlign: "center",
  },

  cardTitle: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 6,
  },

  cardValue: {
    fontSize: 22,
    fontWeight: 700,
    color: "#0f172a",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 10,
  },
};
