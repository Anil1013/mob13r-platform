import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

import {
  checkStatus,
  executePinSend,
  executePinVerify,
} from "../services/offers";

export default function OfferExecute() {
  const { id: offerId } = useParams();
  const navigate = useNavigate();

  const [msisdn, setMsisdn] = useState("");
  const [pin, setPin] = useState("");
  const [transactionId, setTransactionId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  /* ================= LOG HELPER ================= */
  const addLog = (title, data) => {
    setLogs((prev) => [
      {
        title,
        data,
        time: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
  };

  /* ================= STEP 1: STATUS CHECK ================= */
  const handleStatusCheck = async () => {
    try {
      setLoading(true);

      const res = await checkStatus(offerId, { msisdn });

      setTransactionId(res.transaction_id);
      addLog("Status Check", res.response);
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

      setTransactionId(res.transaction_id);
      addLog("PIN Send", res.response);
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

      addLog("PIN Verify", res.response);
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
          {/* HEADER */}
          <div style={styles.headerRow}>
            <h2>Offer Execution</h2>

            <div style={{ display: "flex", gap: 10 }}>
              {transactionId && (
                <button
                  style={styles.logsBtn}
                  onClick={() =>
                    navigate(
                      `/execution-logs?transaction_id=${transactionId}`
                    )
                  }
                >
                  View Logs
                </button>
              )}

              <button
                style={styles.back}
                onClick={() => navigate(-1)}
              >
                ← Back
              </button>
            </div>
          </div>

          {/* INPUT CARD */}
          <div style={styles.card}>
            <h4 style={styles.cardTitle}>Subscriber Details</h4>

            <input
              style={styles.input}
              placeholder="MSISDN (e.g. 9715xxxxxxx)"
              value={msisdn}
              onChange={(e) => setMsisdn(e.target.value)}
            />

            <input
              style={styles.input}
              placeholder="PIN (only for verify)"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />

            <div style={styles.buttons}>
              <button
                style={styles.primary}
                disabled={loading || !msisdn}
                onClick={handleStatusCheck}
              >
                1️⃣ Status Check
              </button>

              <button
                style={styles.primary}
                disabled={loading || !transactionId}
                onClick={handlePinSend}
              >
                2️⃣ PIN Send
              </button>

              <button
                style={styles.success}
                disabled={loading || !pin || !transactionId}
                onClick={handlePinVerify}
              >
                3️⃣ PIN Verify
              </button>
            </div>

            {transactionId && (
              <div style={styles.tx}>
                Transaction ID: <b>{transactionId}</b>
              </div>
            )}
          </div>

          {/* LOGS */}
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
  main: {
    flex: 1,
    background: "#020617",
    minHeight: "100vh",
  },
  content: {
    padding: 24,
    color: "#fff",
    maxWidth: "900px",
    margin: "0 auto",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  back: {
    background: "#334155",
    border: "none",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: 6,
    cursor: "pointer",
  },
  logsBtn: {
    background: "#2563eb",
    border: "none",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
  },
  card: {
    border: "1px solid #1e293b",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  cardTitle: {
    marginBottom: 12,
    color: "#38bdf8",
  },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: 10,
    borderRadius: 8,
    border: "1px solid #1e293b",
    background: "#020617",
    color: "#fff",
  },
  buttons: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 10,
  },
  primary: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "10px 14px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
  },
  success: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    padding: "10px 14px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
  },
  tx: {
    marginTop: 12,
    fontSize: 13,
    color: "#94a3b8",
  },
  logs: {
    marginTop: 20,
  },
  logCard: {
    border: "1px solid #1e293b",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  logHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 6,
    color: "#38bdf8",
    fontSize: 13,
  },
  time: {
    color: "#94a3b8",
  },
  pre: {
    background: "#020617",
    padding: 10,
    borderRadius: 8,
    fontSize: 12,
    overflowX: "auto",
  },
  empty: {
    color: "#94a3b8",
    fontSize: 13,
  },
};
