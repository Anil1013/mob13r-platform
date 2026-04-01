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
          landing.redirect_url || "https://google.com";
      } else {
        alert("Invalid OTP");
      }
    } catch (e) {
      alert("Error verifying OTP");
    }

    setLoading(false);
  };

  if (!landing) return <div style={{ textAlign: "center" }}>Loading...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={{ marginBottom: 10 }}>{landing.title}</h2>

        {landing.image_url && (
          <img src={landing.image_url} alt="" style={styles.image} />
        )}

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
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f5f6fa",
  },
  card: {
    width: 320,
    padding: 25,
    borderRadius: 10,
    background: "#fff",
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
    border: "1px solid #ccc",
  },
  button: {
    width: "100%",
    padding: 12,
    background: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: 5,
    cursor: "pointer",
  },
  image: {
    width: "100%",
    marginBottom: 10,
  },
  disclaimer: {
    marginTop: 10,
    fontSize: 12,
    color: "#777",
  },
};
