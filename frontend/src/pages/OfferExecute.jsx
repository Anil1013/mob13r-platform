import { useState } from "react";
import { useParams } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

import {
  executePinSend,
  executePinVerify,
  checkStatus,
} from "../services/offers";

export default function OfferExecute() {
  const { offerId } = useParams();

  const [msisdn, setMsisdn] = useState("");
  const [pin, setPin] = useState("");
  const [transactionId, setTransactionId] = useState("");

  const [step, setStep] = useState("status"); // status | pin-send | pin-verify
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  /* ================= STATUS CHECK ================= */
  const handleStatusCheck = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await checkStatus(offerId, { msisdn });

      setTransactionId(res.transaction_id);
      setResult(res.response);
      setStep("pin-send");
    } catch (err) {
      setError("Status check failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= PIN SEND ================= */
  const handlePinSend = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await executePinSend(offerId, {
        msisdn,
        transaction_id: transactionId,
      });

      setTransactionId(res.transaction_id);
      setResult(res.response);
      setStep("pin-verify");
    } catch (err) {
      setError("PIN send failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= PIN VERIFY ================= */
  const handlePinVerify = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await executePinVerify(offerId, {
        msisdn,
        pin,
        transaction_id: transactionId,
      });

      setResult(res.response);
    } catch (err) {
      setError("PIN verify failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div style={styles.main}>
        <Header />

        <div style={styles.content}>
          <h2 style={styles.title}>Offer Execution</h2>

          {/* INPUTS */}
          <div style={styles.card}>
            <Input
              label="MSISDN"
              value={msisdn}
              onChange={(e) => setMsisdn(e.target.value)}
              placeholder="919876543210"
            />

            {step === "pin-verify" && (
              <Input
                label="PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="1234"
              />
            )}

            {/* ACTION BUTTONS */}
            <div style={styles.actions}>
              {step === "status" && (
                <button
                  onClick={handleStatusCheck}
                  disabled={loading || !msisdn}
                  style={styles.primary}
                >
                  Check Status
                </button>
              )}

              {step === "pin-send" && (
                <button
                  onClick={handlePinSend}
                  disabled={loading}
                  style={styles.primary}
                >
                  Send PIN
                </button>
              )}

              {step === "pin-verify" && (
                <button
                  onClick={handlePinVerify}
                  disabled={loading || !pin}
                  style={styles.success}
                >
                  Verify PIN
                </button>
              )}
            </div>
          </div>

          {/* TRANSACTION */}
          {transactionId && (
            <div style={styles.info}>
              <strong>Transaction ID:</strong> {transactionId}
            </div>
          )}

          {/* RESULT */}
          {result && (
            <pre style={styles.result}>
              {JSON.stringify(result, null, 2)}
            </pre>
          )}

          {/* ERROR */}
          {error && <div style={styles.error}>{error}</div>}
        </div>
      </div>
    </div>
  );
}

/* ================= SMALL COMPONENT ================= */

const Input = ({ label, ...props }) => (
  <div style={styles.inputGroup}>
    <label style={styles.label}>{label}</label>
    <input {...props} style={styles.input} />
  </div>
);

/* ================= STYLES ================= */

const styles = {
  main: {
    flex: 1,
    background: "#020617",
    minHeight: "100vh",
  },
  content: {
    padding: 24,
    color: "#fff",
    maxWidth: "600px",
    margin: "0 auto",
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  card: {
    border: "1px solid #1e293b",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 4,
  },
  input: {
    padding: 10,
    borderRadius: 8,
    border: "1px solid #1e293b",
    background: "#020617",
    color: "#fff",
  },
  actions: {
    marginTop: 16,
  },
  primary: {
    width: "100%",
    padding: 12,
    background: "#2563eb",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  success: {
    width: "100%",
    padding: 12,
    background: "#16a34a",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  info: {
    fontSize: 13,
    color: "#93c5fd",
    marginBottom: 12,
  },
  result: {
    background: "#020617",
    border: "1px solid #1e293b",
    borderRadius: 8,
    padding: 12,
    fontSize: 12,
    whiteSpace: "pre-wrap",
  },
  error: {
    marginTop: 12,
    background: "#7f1d1d",
    padding: 10,
    borderRadius: 8,
    color: "#fecaca",
  },
};
