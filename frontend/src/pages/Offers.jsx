import { useParams } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

export default function AdvertiserOffers() {
  const { id } = useParams();

  // 🔁 Dummy data (API-ready)
  const offers = [
    {
      id: 1,
      name: "Shemaroo Weekly Pack",
      geo: "Kuwait",
      carrier: "Zain",
      payout: 0.50,
      revenue: 1.20,
      status: "Active",
      landingUrl: "https://example.com/shemaroo",
    },
    {
      id: 2,
      name: "Zain Sports Bundle",
      geo: "Kuwait",
      carrier: "Zain",
      payout: 0.70,
      revenue: 1.50,
      status: "Paused",
      landingUrl: "https://example.com/zain",
    },
  ];

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div style={styles.main}>
        <Header />

        <div style={styles.content}>
          <h2 style={styles.title}>Advertiser Offers</h2>
          <p style={styles.subtitle}>
            Managing offers for advertiser ID: {id}
          </p>

          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Geo</th>
                  <th>Carrier</th>
                  <th>Payout</th>
                  <th>Revenue</th>
                  <th>Status</th>
                  <th>Landing</th>
                </tr>
              </thead>

              <tbody>
                {offers.map((o) => (
                  <tr key={o.id}>
                    <td>{o.name}</td>
                    <td>{o.geo}</td>
                    <td>{o.carrier}</td>
                    <td>${o.payout.toFixed(2)}</td>
                    <td>${o.revenue.toFixed(2)}</td>
                    <td>
                      <span
                        style={{
                          ...styles.status,
                          background:
                            o.status === "Active"
                              ? "#16a34a"
                              : "#ca8a04",
                        }}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td>
                      <a
                        href={o.landingUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={styles.link}
                      >
                        Open
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  main: {
    flex: 1,
    background: "#020617",
    minHeight: "100vh",
  },
  content: {
    padding: "24px",
    color: "#fff",
  },
  title: {
    fontSize: "26px",
    marginBottom: "6px",
  },
  subtitle: {
    color: "#94a3b8",
    marginBottom: "20px",
  },
  card: {
    border: "1px solid #1e293b",
    borderRadius: "12px",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "center",
  },
  status: {
    padding: "4px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    color: "#fff",
  },
  link: {
    color: "#38bdf8",
    fontWeight: 600,
    textDecoration: "none",
  },
};
