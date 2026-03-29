import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

const API_BASE = "https://backend.mob13r.com";

export default function DynamicLanding() {
  const { id } = useParams();

  const [landing, setLanding] = useState(null);
  const [msisdn, setMsisdn] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("input");
  const [sessionToken, setSessionToken] = useState("");

  /* ❌ REMOVE api_key */
  // const apiKey = urlParams.get("api_key");

  useEffect(() => {
    fetch(`${API_BASE}/api/landing/${id}`)
      .then((res) => res.json())
      .then((res) => {
        console.log("LANDING:", res);
        setLanding(res.data);
      })
      .catch(console.error);
  }, [id]);

  /* 🔥 SEND PIN */
  const sendPin = async () => {
    const res = await fetch(
      `${API_BASE}/api/publisher/pin/send?offer_id=${landing.offer_id}&msisdn=${msisdn}`
    );

    const data = await res.json();

    if (data.session_token) {
      setSessionToken(data.session_token);
      setStep("otp");
    } else {
      alert(data.message || "Failed");
    }
  };

  /* 🔥 VERIFY */
  const verifyPin = async () => {
    const res = await fetch(
      `${API_BASE}/api/publisher/pin/verify?session_token=${sessionToken}&otp=${otp}`
    );

    const data = await res.json();

    if (data.status === "SUCCESS") {
      window.location.href = data.portal_url || "/";
    } else {
      alert(data.message || "Invalid OTP");
    }
  };

  if (!landing) return <div>Loading...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>{landing.title}</h2>
        <p>{landing.description}</p>

        {step === "input" && (
          <>
            <input
              placeholder="Enter Mobile"
              value={msisdn}
              onChange={(e) => setMsisdn(e.target.value)}
              style={styles.input}
            />
            <button onClick={sendPin} style={styles.button}>
              Send OTP
            </button>
          </>
        )}

        {step === "otp" && (
          <>
            <input
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              style={styles.input}
            />
            <button onClick={verifyPin} style={styles.button}>
              Verify OTP
            </button>
          </>
        )}

        <p style={styles.disclaimer}>{landing.disclaimer}</p>
      </div>
    </div>
  );
}

/* 🔥 STYLES */
const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "#f3f4f6",
  },
  card: {
    background: "#fff",
    padding: 20,
    borderRadius: 10,
    width: 350,
  },
  input: {
    width: "100%",
    padding: 10,
    marginTop: 10,
    borderRadius: 6,
    border: "1px solid #ccc",
  },
  button: {
    marginTop: 10,
    padding: 12,
    width: "100%",
    background: "#22c55e",
    color: "#fff",
    border: "none",
    borderRadius: 6,
  },
  disclaimer: {
    marginTop: 10,
    fontSize: 12,
    color: "#777",
  },
};
