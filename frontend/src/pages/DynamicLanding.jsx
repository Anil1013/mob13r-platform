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
      else alert("OTP failed");
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
    } catch (e) { alert("Verification Error"); }
    setLoading(false);
  };

  if (!landing) return <div style={{ textAlign: "center", paddingTop: 50 }}>Loading...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ background: "#16a34a", color: "#fff", fontSize: 10, padding: "6px", fontWeight: "bold" }}>✓ SECURE CONNECTION</div>
        
        {/* 🔥 FIX: Agar path mein 'uploads' nahi hai toh ensure karna backend se aa raha ho */}
        {landing.image_url && (
          <img 
            src={landing.image_url.startsWith('http') ? landing.image_url : `${API_BASE}${landing.image_url}`} 
            style={styles.image} 
            alt="Content" 
          />
        )}
        
        <div style={{ padding: 25 }}>
          <h2 style={styles.title}>{landing.title}</h2>
          <p style={styles.desc}>{landing.description}</p>
          
          {step === "msisdn" ? (
            <><input style={styles.input} placeholder="Mobile Number" value={msisdn} onChange={(e) => setMsisdn(e.target.value)} />
            <button style={styles.button} onClick={sendPin}>{loading ? "Sending..." : landing.button_text || "Continue"}</button></>
          ) : (
            <><input style={styles.input} placeholder="Enter PIN" value={otp} onChange={(e) => setOtp(e.target.value)} />
            <button style={{...styles.button, background: "#2563eb"}} onClick={verifyPin}>{loading ? "Verifying..." : "Confirm PIN"}</button></>
          )}
          <p style={styles.disclaimer}>{landing.disclaimer}</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "#0f172a", display: "flex", justifyContent: "center", alignItems: "center", padding: 20 },
  card: { width: "100%", maxWidth: 380, background: "#fff", borderRadius: 16, overflow: "hidden", textAlign: "center", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" },
  image: { width: "100%", height: 210, objectFit: "cover" },
  title: { fontSize: 22, fontWeight: "800", color: "#1e293b", marginBottom: 10 },
  desc: { fontSize: 14, color: "#64748b", marginBottom: 20 },
  input: { width: "100%", padding: 14, borderRadius: 10, border: "2px solid #e2e8f0", marginBottom: 15, boxSizing: "border-box", outline: "none" },
  button: { width: "100%", padding: 15, background: "#16a34a", color: "#fff", border: "none", borderRadius: 10, fontWeight: "bold", cursor: "pointer", fontSize: 16 },
  disclaimer: { fontSize: 10, color: "#94a3b8", marginTop: 20 }
};
