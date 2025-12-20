import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

/* 🔑 Offer ID Generator */
const generateOfferId = (geo, carrier, index) =>
  `OFF-${geo.slice(0, 2).toUpperCase()}-${carrier
    .slice(0, 4)
    .toUpperCase()}-${String(index + 1).padStart(3, "0")}`;

export default function Offers() {
  const [offers, setOffers] = useState([
    {
      name: "Shemaroo Weekly Pack",
      geo: "Kuwait",
      carrier: "Zain",
      payout: 0.5,
      revenue: 1.2,
      status: "Active",

      apis: {
        pinSend: "https://api.example.com/pin/send",
        pinVerify: "https://api.example.com/pin/verify",
        statusCheck: "https://api.example.com/status",
        portalUrl: "https://portal.example.com/subscribe",
      },
    },
  ]);

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div style={styles.main}>
        <Header />

        <div style={styles.content}>
          <h2 style={styles.title}>Offers</h2>
          <p style={styles.subtitle}>
            Each offer includes PIN flow & portal configuration
          </p>

          {offers.map((offer, index) => (
            <div key={index} style={styles.card}>
              <div style={styles.headerRow}>
                <strong>{offer.name}</strong>
                <span style={styles.mono}>
                  {generateOfferId(offer.geo, offer.carrier, index)}
                </span>
              </div>

              <div style={styles.grid}>
                <Field label="Geo" value={offer.geo} />
                <Field label="Carrier" value={offer.carrier} />
                <Field label="Payout" value={`$${offer.payout}`} />
                <Field label="Revenue" value={`$${offer.revenue}`} />
                <Field label="Status" value={offer.status} />
              </div>

              <div style={styles.apiBox}>
                <ApiField title="PIN Send API" value={offer.apis.pinSend} />
                <ApiField title="PIN Verify API" value={offer.apis.pinVerify} />
                <ApiField
                  title="Status Check API"
                  value={offer.apis.statusCheck}
                />
                <ApiField title="Portal URL" value={offer.apis.portalUrl} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Small Reusable Components ---------- */

const Field = ({ label, value }) => (
  <div>
    <div style={styles.label}>{label}</div>
    <div>{value}</div>
  </div>
);

const ApiField = ({ title, value }) => (
  <div style={styles.apiRow}>
    <div style={styles.apiTitle}>{title}</div>
    <code style={styles.code}>{value}</code>
  </div>
);

/* ---------------- STYLES ---------------- */

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
    padding: "16px",
    marginBottom: "20px",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "12px",
  },
  mono: {
    fontFamily: "monospace",
    color: "#93c5fd",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "16px",
    marginBottom: "16px",
  },
  label: {
    fontSize: "12px",
    color: "#94a3b8",
  },
  apiBox: {
    borderTop: "1px solid #1e293b",
    paddingTop: "12px",
  },
  apiRow: {
    marginBottom: "10px",
  },
  apiTitle: {
    fontSize: "13px",
    color: "#94a3b8",
    marginBottom: "4px",
  },
  code: {
    display: "block",
    background: "#020617",
    padding: "8px",
    borderRadius: "6px",
    fontSize: "12px",
    color: "#e5e7eb",
    overflowX: "auto",
  },
};
