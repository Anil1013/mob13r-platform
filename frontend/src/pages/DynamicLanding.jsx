import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

const API_BASE = "https://backend.mob13r.com";

export default function DynamicLanding() {
  const { id } = useParams();

  const [landing, setLanding] = useState(null);
  const [msisdn, setMsisdn] = useState("");
  const [otp, setOtp] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [step, setStep] = useState("msisdn");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/landing/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "SUCCESS") {
          setLanding(data.data);
        }
      });
  }, [id]);

  const sendPin = async () => {
    setLoading(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/publisher/pin/send?offer_id=${landing.offer_id}&msisdn=${msisdn}&geo=IQ&carrier=Zain&x-api-key=${landing.api_key}`
      );

      const data = await res.json();

      if (data.status === "OTP_SENT") {
        setSessionToken(data.session_token);
        setStep("otp");
      } else {
        alert("OTP failed");
      }
    } catch (e) {
      alert("Error sending OTP");
    }

    setLoading(false);
  };

  const verifyPin = async () => {
    setLoading(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/pin/verify?session_token=${sessionToken}&otp=${otp}&x-api-key=${landing.api_key}`
      );

      const data = await res.json();

      if (data.status === "SUCCESS") {
        window.location.href =
          landing?.redirect_url || "https://google.com";
      } else {
        alert("Invalid OTP");
      }
    } catch (e) {
      alert("Error verifying OTP");
    }

    setLoading(false);
  };

  if (!landing)
    return <div style={{ textAlign: "center" }}>Loading...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        {/* IMAGE + TITLE FIXED */}
        {landing.image_url && (
          <>
            <img
              src={landing.image_url}
              alt=""
              style={styles.image}
            />

            <div style={styles.title}>
              {landing.title}
            </div>
          </>
        )}

        {!landing.image_url && (
          <div style={styles.title}>{landing.title}</div>
        )}

        {/* MSISDN STEP */}
        {step === "msisdn" && (
          <>
            <input
              style={styles.input}
              placeholder="Enter Mobile Number"
              value={msisdn}
              onChange={(e) => setMsisdn(e.target.value)}
            />

            <button style={styles.button} onClick={sendPin}>
              {loading ? "Sending..." : landing.button_text || "Send OTP"}
            </button>
          </>
        )}

        {/* OTP STEP */}
        {step === "otp" && (
          <>
            <input
              style={styles.input}
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />

            <button style={styles.button} onClick={verifyPin}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </>
        )}

        <p style={styles.disclaimer}>{landing.disclaimer}</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg,#0f172a,#1e293b)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  card: {
    width: 360,
    background: "#0f172a",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
    color: "#fff",
    textAlign: "center",
    paddingBottom: 20,
  },

  image: {
    width: "100%",
    height: 200,
    objectFit: "cover",
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    margin: "15px 0",
    padding: "0 10px",
  },

  input: {
    width: "85%",
    padding: 12,
    borderRadius: 8,
    border: "none",
    marginBottom: 15,
    outline: "none",
  },

  button: {
    width: "85%",
    padding: 14,
    background: "#22c55e",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },

  disclaimer: {
    fontSize: 11,
    color: "#9ca3af",
    padding: 15,
  },
};
