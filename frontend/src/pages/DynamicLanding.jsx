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

  /* 🔥 FETCH LANDING */
  useEffect(() => {
    fetch(`${API_BASE}/api/landing/${id}`)
      .then((res) => res.json())
      .then((res) => setLanding(res.data));
  }, [id]);

  /* 🔥 GEO + CARRIER DETECT */
  const detectGeoCarrier = (msisdn) => {
    const num = msisdn.replace(/\D/g, "");

    if (num.startsWith("96478")) {
      return { geo: "IQ", carrier: "Zain" };
    }
    if (num.startsWith("96477")) {
      return { geo: "IQ", carrier: "Asiacell" };
    }
    if (num.startsWith("96475")) {
      return { geo: "IQ", carrier: "Korek" };
    }

    if (num.startsWith("97150")) {
      return { geo: "AE", carrier: "Etisalat" };
    }
    if (num.startsWith("97152")) {
      return { geo: "AE", carrier: "Du" };
    }

    if (num.startsWith("9665")) {
      return { geo: "SA", carrier: "STC" };
    }
    if (num.startsWith("96655")) {
      return { geo: "SA", carrier: "Zain" };
    }

    return { geo: "IQ", carrier: "Zain" }; // fallback
  };

  /* 🔥 SEND PIN */
  const sendPin = async () => {
    if (!msisdn) return alert("Enter number");

    const { geo, carrier } = detectGeoCarrier(msisdn);

    try {
      const res = await fetch(
        `${API_BASE}/api/publisher/pin/send?offer_id=${landing.offer_id}&msisdn=${msisdn}&geo=${geo}&carrier=${carrier}&x-api-key=${landing.api_key}`
      );

      const data = await res.json();

      if (data.session_token) {
        setSessionToken(data.session_token);
        setStep("otp");
      } else {
        alert(data.message || "Failed to send OTP");
      }
    } catch (err) {
      alert("Server error");
    }
  };

  /* 🔥 VERIFY PIN */
  const verifyPin = async () => {
    if (!otp) return alert("Enter OTP");

    try {
      const res = await fetch(
        `${API_BASE}/api/publisher/pin/verify?session_token=${sessionToken}&otp=${otp}&x-api-key=${landing.api_key}`
      );

      const data = await res.json();

      if (data.status === "SUCCESS") {
        if (data.portal_url) {
          window.location.href = data.portal_url;
        } else {
          alert("Success");
        }
      } else {
        alert(data.message || "Invalid OTP");
      }
    } catch (err) {
      alert("Verification failed");
    }
  };

  if (!landing) return <div>Loading...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>{landing.title}</h2>
        <p>{landing.description}</p>

        {landing.image_url && (
          <img src={landing.image_url} alt="" style={styles.image} />
        )}

        {step === "input" && (
          <>
            <input
              type="text"
              placeholder="Enter Mobile Number"
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
              type="text"
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
    background: "#f4f4f4",
  },
  card: {
    background: "#fff",
    padding: 30,
    borderRadius: 10,
    width: 320,
    textAlign: "center",
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  },
  input: {
    width: "100%",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    border: "1px solid #ccc",
  },
  button: {
    width: "100%",
    padding: 10,
    background: "#22c55e",
    color: "#fff",
    border: "none",
    borderRadius: 5,
    cursor: "pointer",
  },
  image: {
    width: "100%",
    borderRadius: 8,
    marginBottom: 10,
  },
  disclaimer: {
    fontSize: 12,
    marginTop: 10,
    color: "#555",
  },
};
