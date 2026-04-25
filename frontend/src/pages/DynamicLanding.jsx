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
      // ✅ Dynamic Geo & Carrier based on landing data
      const res = await fetch(
        `${API_BASE}/api/publisher/pin/send?offer_id=${landing.offer_id}&msisdn=${msisdn}&geo=${landing.geo || 'IQ'}&carrier=${landing.carrier || 'Zain'}&x-api-key=${landing.api_key}`
      );
      const data = await res.json();
      if (data.status === "OTP_SENT") {
        setSessionToken(data.session_token);
        setStep("otp");
      } else {
        alert(data.message || "OTP failed");
      }
    } catch (e) {
      alert("Connection Error");
    }
    setLoading(false);
  };

  const verifyPin = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/publisher/pin/verify?session_token=${sessionToken}&otp=${otp}&x-api-key=${landing.api_key}`
      );
      const data = await res.json();
      if (data.status === "SUCCESS") {
        // ✅ Redirect to actual redirect_url from database
        window.location.href = landing?.redirect_url || "https://google.com";
      } else {
        alert("Invalid PIN");
      }
    } catch (e) {
      alert("Verification Error");
    }
    setLoading(false);
  };

  if (!landing) return <div style={{ textAlign: "center", paddingTop: 50, color: "#fff" }}>Loading Content...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Trust Badge for US/UK Traffic */}
        <div style={{ background: "#16a34a", color: "#fff", fontSize: 10, padding: "5px 0", fontWeight: "bold" }}>
          ✓ SECURE ENCRYPTED CONNECTION
        </div>

        {landing.image_url && (
          <img src={landing.image_url} alt="" style={styles.image} />
        )}

        <div style={styles.contentBox}>
          <div style={styles.title}>{landing.title || "Premium Content"}</div>
          <p style={styles.description}>{landing.description}</p>

          {step === "msisdn" && (
            <>
              <input
                style={styles.input}
                placeholder="Mobile Number (e.g. 07XXXXXXXX)"
                value={msisdn}
                onChange={(e) => setMsisdn(e.target.value)}
              />
              <button style={styles.button} onClick={sendPin}>
                {loading ? "Please wait..." : landing.button_text || "GET ACCESS"}
              </button>
            </>
          )}

          {step === "otp" && (
            <>
              <p style={{ fontSize: 12, marginBottom: 10 }}>Enter the PIN sent to your phone</p>
              <input
                style={{ ...styles.input, textAlign: "center", letterSpacing: 5 }}
                placeholder="XXXX"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <button style={{ ...styles.button, background: "#3b82f6" }} onClick={verifyPin}>
                {loading ? "Verifying..." : "CONFIRM PIN"}
              </button>
            </>
          )}

          <p style={styles.disclaimer}>
            {landing.disclaimer || "By clicking, you agree to the Terms of Service. Standard operator charges apply."}
          </p>
        </div>
      </div>
      
      {/* Footer Branding */}
      <div style={{ position: "absolute", bottom: 20, color: "#4b5563", fontSize: 10 }}>
        Powered by Mob13r AdTech System
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "#000", display: "flex", justifyContent: "center", alignItems: "center", padding: 20, fontFamily: "sans-serif" },
  card: { width: "100%", maxWidth: 380, background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.5)", textAlign: "center" },
  image: { width: "100%", height: 210, objectFit: "cover" },
  contentBox: { padding: 25 },
  title: { fontSize: 24, fontWeight: "800", color: "#111", marginBottom: 10 },
  description: { fontSize: 14, color: "#666", marginBottom: 20, lineHeight: "1.4" },
  input: { width: "100%", padding: 15, borderRadius: 8, border: "2px solid #e5e7eb", marginBottom: 15, outline: "none", fontSize: 16, boxSizing: "border-box" },
  button: { width: "100%", padding: 16, background: "#16a34a", border: "none", borderRadius: 8, color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: 16 },
  disclaimer: { fontSize: 10, color: "#9ca3af", marginTop: 20, lineHeight: "1.4" },
};
