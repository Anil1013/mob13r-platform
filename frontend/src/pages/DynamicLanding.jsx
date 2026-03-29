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

  /* 🔥 GET API KEY FROM URL */
  const urlParams = new URLSearchParams(window.location.search);
  const apiKey = urlParams.get("api_key");

  useEffect(() => {
    fetch(`${API_BASE}/api/landing/${id}`)
      .then((res) => res.json())
      .then((res) => setLanding(res.data));
  }, [id]);

  /* 🔥 CORRECT CARRIER */
  const detectGeoCarrier = (msisdn) => {
    const num = msisdn.replace(/\D/g, "");

    if (num.startsWith("96478")) {
      return { geo: "IQ", carrier: "Asiacell" };
    }
    if (num.startsWith("96477")) {
      return { geo: "IQ", carrier: "Zain" };
    }

    return { geo: "IQ", carrier: "Zain" };
  };

  /* 🔥 SEND PIN */
  const sendPin = async () => {
    const { geo, carrier } = detectGeoCarrier(msisdn);

    const res = await fetch(
      `${API_BASE}/api/publisher/pin/send?offer_id=${landing.offer_id}&msisdn=${msisdn}&geo=${geo}&carrier=${carrier}&x-api-key=${apiKey}`
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
      `${API_BASE}/api/publisher/pin/verify?session_token=${sessionToken}&otp=${otp}&x-api-key=${apiKey}`
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

        {landing.image_url && (
          <img src={landing.image_url} alt="" style={styles.image} />
        )}

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

const styles = { /* same styles */ };
