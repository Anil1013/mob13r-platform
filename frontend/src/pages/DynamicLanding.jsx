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
    fetch(`${API_BASE}/api/landing/${id}`).then(res => res.json()).then(data => { if (data.status === "SUCCESS") setLanding(data.data); });
  }, [id]);

  const sendPin = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/publisher/pin/send?offer_id=${landing.offer_id}&msisdn=${msisdn}&geo=${landing.geo || 'N/A'}&carrier=${landing.carrier || 'N/A'}&x-api-key=${landing.api_key}`);
      const data = await res.json();
      if (data.status === "OTP_SENT") { setSessionToken(data.session_token); setStep("otp"); }
      else alert(data.message || "OTP failed");
    } catch (e) { alert("Error"); }
    setLoading(false);
  };

  const verifyPin = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/publisher/pin/verify?session_token=${sessionToken}&otp=${otp}&x-api-key=${landing.api_key}`);
      const data = await res.json();
      if (data.status === "SUCCESS") window.location.href = landing?.redirect_url || "https://google.com";
      else alert("Invalid PIN");
    } catch (e) { alert("Error"); }
    setLoading(false);
  };

  if (!landing) return <div style={{ textAlign: "center", paddingTop: 100 }}>Loading...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ background: "#16a34a", color: "#fff", fontSize: 11, padding: "8px", fontWeight: "bold" }}>✓ SECURE ENCRYPTED CONNECTION</div>
        {landing.image_url && <img src={landing.image_url.startsWith('http') ? landing.image_url : `${API_BASE}${landing.image_url}`} style={styles.image} alt="content" />}
        <div style={{ padding: 30 }}>
          <h2 style={styles.title}>{landing.title}</h2>
          <p style={styles.desc}>{landing.description}</p>
          {step === "msisdn" ? (
            <><input style={styles.input} placeholder="Mobile Number" value={msisdn} onChange={(e) => setMsisdn(e.target.value)} />
            <button style={styles.button} onClick={sendPin}>{loading ? "..." : landing.button_text || "Continue"}</button></>
          ) : (
            <><input style={styles.input} placeholder="Enter PIN" value={otp} onChange={(e) => setOtp(e.target.value)} />
            <button style={{...styles.button, background: "#2563eb"}} onClick={verifyPin}>{loading ? "..." : "Verify & Access"}</button></>
          )}
          <p style={styles.disclaimer}>{landing.disclaimer}</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "#0f172a", display: "flex", justifyContent: "center", alignItems: "center", padding: 20, fontFamily: 'sans-serif' },
  card: { width: "100%", maxWidth: 400, background: "#fff", borderRadius: 20, overflow: "hidden", textAlign: "center", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" },
  image: { width: "100%", height: 220, objectFit: "cover" },
  title: { fontSize: 24, fontWeight: "800", color: "#1e293b", marginBottom: 12 },
  desc: { fontSize: 15, color: "#64748b", marginBottom: 25 },
  input: { width: "100%", padding: 15, borderRadius: 12, border: "2px solid #e2e8f0", marginBottom: 15, boxSizing: "border-box", fontSize: 16 },
  button: { width: "100%", padding: 16, background: "#16a34a", color: "#fff", border: "none", borderRadius: 12, fontWeight: "bold", cursor: "pointer", fontSize: 18 },
  disclaimer: { fontSize: 11, color: "#94a3b8", marginTop: 20 }
};
