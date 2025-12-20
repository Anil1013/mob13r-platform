import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

/* ================= OFFER CONFIG ================= */

const offers = [
  {
    id: "OFF-KW-ZAIN-001",
    name: "ShemarooMe Weekly",
    geo: "Kuwait",
    carrier: "Zain",

    service_id: "2c80d832-2710-4603-84d1-2b6b81bba849",
    partner_id: "c8698098-a640-4e58-b585-c793c1a360de",

    payout: 0.8,
    revenue: 1.5,

    apis: {
      checkStatus: {
        method: "POST",
        url: "/api/check-status", // backend proxy
      },
      sendOtp: {
        method: "POST",
        url: "/api/send-otp",
      },
      verifyOtp: {
        method: "POST",
        url: "/api/verify-otp",
      },
      productUrl: {
        method: "POST",
        url: "/api/product-url",
      },
    },
  },
];

/* ================= MAIN COMPONENT ================= */

export default function Offers() {
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [msisdn, setMsisdn] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("IDLE");
  const [log, setLog] = useState("");

  const transaction_id = crypto.randomUUID();

  /* ================= EXECUTION HANDLERS ================= */

  const checkStatus = async () => {
    setStep("CHECK_STATUS");

    setLog("Checking subscription status...");
    // BACKEND CALL HERE
    setTimeout(() => {
      setLog("New user detected");
      setStep("SEND_OTP");
    }, 1000);
  };

  const sendOtp = async () => {
    setLog("Sending OTP (Fraud token included)");
    setStep("VERIFY_OTP");
  };

  const verifyOtp = async () => {
    setLog("OTP verified successfully");
    setStep("REDIRECT");
  };

  const redirectUser = async () => {
    setLog("Redirecting to product URL...");
    window.open("https://www.shemaroome.com/", "_blank");
  };

  /* ================= UI ================= */

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div style={styles.main}>
        <Header />

        <div style={styles.content}>
          <h2>Offers</h2>

          {/* OFFER LIST */}
          <table style={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Geo</th>
                <th>Carrier</th>
                <th>Execute</th>
              </tr>
            </thead>

            <tbody>
              {offers.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.name}</td>
                  <td>{o.geo}</td>
                  <td>{o.carrier}</td>
                  <td>
                    <button
                      style={styles.btn}
                      onClick={() => {
                        setSelectedOffer(o);
                        setStep("INPUT");
                      }}
                    >
                      Run Flow
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* EXECUTION PANEL */}
          {selectedOffer && (
            <div style={styles.panel}>
              <h3>Offer Execution Flow</h3>

              <input
                placeholder="MSISDN (965XXXXXXX)"
                value={msisdn}
                onChange={(e) => setMsisdn(e.target.value)}
              />

              {step === "VERIFY_OTP" && (
                <input
                  placeholder="OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              )}

              <div style={styles.actions}>
                {step === "INPUT" && (
                  <button onClick={checkStatus}>Check Status</button>
                )}
                {step === "SEND_OTP" && (
                  <button onClick={sendOtp}>Send OTP</button>
                )}
                {step === "VERIFY_OTP" && (
                  <button onClick={verifyOtp}>Verify OTP</button>
                )}
                {step === "REDIRECT" && (
                  <button onClick={redirectUser}>Redirect</button>
                )}
              </div>

              <pre style={styles.log}>{log}</pre>
            </div>
          )}
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
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "center",
  },
  btn: {
    background: "#2563eb",
    color: "#fff",
    padding: "6px 12px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  panel: {
    marginTop: "24px",
    padding: "16px",
    border: "1px solid #1e293b",
    borderRadius: "12px",
  },
  actions: {
    marginTop: "12px",
    display: "flex",
    gap: "10px",
  },
  log: {
    marginTop: "12px",
    background: "#020617",
    padding: "10px",
    fontSize: "12px",
    color: "#94a3b8",
  },
};
