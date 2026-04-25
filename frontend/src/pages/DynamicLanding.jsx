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
      .then(res => res.json())
      .then(data => {
        if (data.status === "SUCCESS") setLanding(data.data);
      })
      .catch(() => alert("Failed to load landing"));
  }, [id]);

  const sendPin = async () => {
    if (!msisdn) return alert("Enter mobile number");

    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/publisher/pin/send?offer_id=${landing.offer_id}&msisdn=${msisdn}&geo=${landing.geo || "N/A"}&carrier=${landing.carrier || "N/A"}&x-api-key=${landing.api_key}`
      );

      const data = await res.json();

      if (data.status === "OTP_SENT") {
        setSessionToken(data.session_token);
        setStep("otp");
      } else {
        alert(data.message || "OTP failed");
      }
    } catch {
      alert("Server error");
    }
    setLoading(false);
  };

  const verifyPin = async () => {
    if (!otp) return alert("Enter OTP");

    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/publisher/pin/verify?session_token=${sessionToken}&otp=${otp}&x-api-key=${landing.api_key}`
      );

      const data = await res.json();

      if (data.status === "SUCCESS") {
        window.location.href =
          landing?.redirect_url || "https://google.com";
      } else {
        alert("Invalid PIN");
      }
    } catch {
      alert("Server error");
    }
    setLoading(false);
  };

  if (!landing)
    return <div style={{ textAlign: "center", paddingTop: 100 }}>Loading...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.secure}>✓ SECURE ENCRYPTED CONNECTION</div>

        {landing.image_url && (
          <img
            src={
              landing.image_url.startsWith("http")
                ? landing.image_url
                : `${API_BASE}${landing.image_url}`
            }
            style={styles.image}
            alt=""
          />
        )}

        <div style={{ padding: 30 }}>
          <h2 style={styles.title}>{landing.title}</h2>
          <p style={styles.desc}>{landing.description}</p>

          {step === "msisdn" ? (
            <>
              <input
                style={styles.input}
                placeholder="Mobile Number"
                value={msisdn}
                onChange={(e) => setMsisdn(e.target.value)}
              />
              <button style={styles.button} onClick={sendPin}>
                {loading ? "..." : landing.button_text || "Continue"}
              </button>
            </>
          ) : (
            <>
              <input
                style={styles.input}
                placeholder="Enter PIN"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <button
                style={{ ...styles.button, background: "#2563eb" }}
                onClick={verifyPin}
              >
                {loading ? "..." : "Verify & Access"}
              </button>
            </>
          )}

          <p style={styles.disclaimer}>{landing.disclaimer}</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "#0f172a", display: "flex", justifyContent: "center", alignItems: "center" },
  card: { width: 400, background: "#fff", borderRadius: 20, overflow: "hidden" },
  secure: { background: "#16a34a", color: "#fff", padding: 8, fontSize: 11 },
  image: { width: "100%", height: 220, objectFit: "cover" },
  title: { fontSize: 24, fontWeight: 800 },
  desc: { color: "#64748b" },
  input: { width: "100%", padding: 12, marginBottom: 10 },
  button: { width: "100%", padding: 14, background: "#16a34a", color: "#fff" },
  disclaimer: { fontSize: 11 }
};
