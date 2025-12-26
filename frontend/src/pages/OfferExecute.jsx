import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

import {
  getOfferById,
  checkStatus,
  executePinSend,
  executePinVerify,
} from "../services/offers";

export default function OfferExecute() {
  const { id: offerId } = useParams();
  const navigate = useNavigate();

  const [offer, setOffer] = useState(null);

  const [msisdn, setMsisdn] = useState("");
  const [pin, setPin] = useState("");
  const [transactionId, setTransactionId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  const [steps, setSteps] = useState({
    status_check: false,
    pin_send: false,
    pin_verify: false,
    anti_fraud: false,
  });

  /* ================= LOAD OFFER (DYNAMIC STEPS) ================= */
  useEffect(() => {
    const loadOffer = async () => {
      try {
        const data = await getOfferById(offerId);
        setOffer(data);

        const apiSteps = data.api_steps || {};
        setSteps({
          status_check: !!apiSteps.status_check?.enabled,
          pin_send: !!apiSteps.pin_send?.enabled,
          pin_verify: !!apiSteps.pin_verify?.enabled,
          anti_fraud: !!apiSteps.anti_fraud?.enabled,
        });
      } catch (err) {
        alert("Failed to load offer execution config");
      }
    };

    loadOffer();
  }, [offerId]);

  /* ================= LOG HELPER ================= */
  const addLog = (title, data) => {
    setLogs((prev) => {
      const next = [
        { title, data, time: new Date().toLocaleTimeString() },
        ...prev,
      ];
      return next.slice(0, 20); // cap logs
    });
  };

  /* ================= VALIDATION ================= */
  const isValidMsisdn = (v) => /^\d{10,15}$/.test(v);

  /* ================= STEP 1: STATUS CHECK ================= */
  const handleStatusCheck = async () => {
    if (!isValidMsisdn(msisdn)) {
      alert("Invalid MSISDN");
      return;
    }

    try {
      setLoading(true);
      const res = await checkStatus(offerId, { msisdn });

      setTransactionId(
        res.transaction_id || res.sessionKey || null
      );
      addLog("Status Check", res);
    } catch (err) {
      addLog("Status Check Failed", err.message || err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= STEP 2: PIN SEND ================= */
  const handlePinSend = async () => {
    try {
      setLoading(true);
      const res = await executePinSend(offerId, {
        msisdn,
        transaction_id: transactionId,
      });

      addLog("PIN Send", res);
    } catch (err) {
      addLog("PIN Send Failed", err.message || err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= STEP 3: PIN VERIFY ================= */
  const handlePinVerify = async () => {
    try {
      setLoading(true);
      const res = await executePinVerify(offerId, {
        msisdn,
        pin,
        transaction_id: transactionId,
      });

      addLog("PIN Verify", res);

      if (res.redirect_url) {
        window.location.href = res.redirect_url;
      }
    } catch (err) {
      addLog("PIN Verify Failed", err.message || err);
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
          <div style={styles.headerRow}>
            <h2>Offer Execution</h2>
            <button style={styles.back} onClick={() => navigate(-1)}>
              ← Back
            </button>
          </div>

          {/* ================= FORM ================= */}
          <div style={styles.card}>
            <h4 style={styles.cardTitle}>
              Subscriber Details
            </h4>

            <input
              style={styles.input}
              placeholder="MSISDN"
              value={msisdn}
              onChange={(e) => setMsisdn(e.target.value)}
            />

            {steps.pin_verify && (
              <input
                style={styles.input}
                placeholder="PIN (only for verify)"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
            )}

            <div style={styles.buttons}>
              {steps.status_check && (
                <button
                  style={styles.primary}
                  disabled={loading || !msisdn}
                  onClick={handleStatusCheck}
                >
                  1️⃣ Status Check
                </button>
              )}

              {steps.pin_send && (
                <button
                  style={styles.primary}
                  disabled={loading || !transactionId}
                  onClick={handlePinSend}
                >
                  2️⃣ PIN Send
                </button>
              )}

              {steps.pin_verify && (
                <button
                  style={styles.success}
                  disabled={loading || !pin || !transactionId}
                  onClick={handlePinVerify}
                >
                  3️⃣ PIN Verify
                </button>
              )}
            </div>

            {transactionId && (
              <div style={styles.tx}>
                Transaction ID: <b>{transactionId}</b>
              </div>
            )}
          </div>

          {/* ================= LOGS ================= */}
          <div style={styles.logs}>
            <h4>Live Execution Logs</h4>

            {logs.length === 0 && (
              <div style={styles.empty}>
                No execution yet
              </div>
            )}

            {logs.map((l, i) => (
              <div key={i} style={styles.logCard}>
                <div style={styles.logHeader}>
                  {l.title}
                  <span style={styles.time}>{l.time}</span>
                </div>
                <pre style={styles.pre}>
                  {JSON.stringify(l.data, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  main: { flex: 1, background: "#020617", minHeight: "100vh" },
  content: { padding: 24, color: "#fff", maxWidth: 900, margin: "0 auto" },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  back: {
    background: "#334155",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
  },
  card: {
    border: "1px solid #1e293b",
    borderRadius: 12,
    padding: 20,
  },
  cardTitle: {
    marginBottom: 12,
    color: "#38bdf8",
  },
  input: {
    width: "100%",
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    background: "#020617",
    color: "#fff",
    border: "1px solid #1e293b",
  },
  buttons: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  primary: {
    background: "#2563eb",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
  },
  success: {
    background: "#16a34a",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
  },
  tx: {
    marginTop: 12,
    color: "#94a3b8",
  },
  logs: { marginTop: 20 },
  logCard: {
    border: "1px solid #1e293b",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  logHeader: {
    display: "flex",
    justifyContent: "space-between",
    color: "#38bdf8",
  },
  time: { color: "#94a3b8" },
  pre: {
    background: "#020617",
    padding: 10,
    borderRadius: 8,
    fontSize: 12,
    marginTop: 6,
    maxHeight: 260,
    overflow: "auto",
  },
  empty: { color: "#94a3b8" },
};
