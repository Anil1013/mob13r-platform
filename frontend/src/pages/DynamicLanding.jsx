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
      // Dynamic Geo/Carrier from Offers Schema
      const res = await fetch(`${API_BASE}/api/publisher/pin/send?offer_id=${landing.offer_id}&msisdn=${msisdn}&geo=${landing.geo || 'N/A'}&carrier=${landing.carrier || 'N/A'}&x-api-key=${landing.api_key}`);
      const data = await res.json();
      if (data.status === "OTP_SENT") { setSessionToken(data.session_token); setStep("otp"); }
      else alert("OTP Request Failed");
    } catch (e) { alert("Server Error"); }
    setLoading(false);
  };

  const verifyPin = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/publisher/pin/verify?session_token=${sessionToken}&otp=${otp}&x-api-key=${landing.api_key}`);
      const data = await res.json();
      if (data.status === "SUCCESS") {
         // Redirect using redirect_url from Schema
         window.location.href = landing?.redirect_url || "https://google.com";
      } else alert("Invalid PIN");
    } catch (e) { alert("Verification Error"); }
    setLoading(false);
  };

  if (!landing) return <div style={{ textAlign: "center", paddingTop: 50, color: "#fff" }}>Loading Content...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{background: "#22c55e", fontSize: 10, padding: "5px", color: "#fff", fontWeight: "bold"}}>✓ SECURE VERIFIED CONNECTION</div>
        {landing.image_url && <img src={landing.image_url} style={styles.image} alt="" />}
        <div style={styles.title}>{landing.title}</div>
        <p style={{fontSize: 14, color: "#666", padding: "0 20px"}}>{landing.description}</p>
        <div style={{padding: "20px"}}>
          {step === "msisdn" ? (
            <><input style={styles.input} placeholder="Mobile Number" value={msisdn} onChange={(e) => setMsisdn(e.target.value)} />
            <button style={styles.button} onClick={sendPin}>{loading ? "Sending..." : landing.button_text || "Continue"}</button></>
          ) : (
            <><input style={styles.input} placeholder="Enter PIN" value={otp} onChange={(e) => setOtp(e.target.value)} />
            <button style={styles.button} onClick={verifyPin}>{loading ? "Verifying..." : "Confirm"}</button></>
          )}
        </div>
        <p style={styles.disclaimer}>{landing.disclaimer}</p>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "#000", display: "flex", justifyContent: "center", alignItems: "center", padding: 20 },
  card: { width: 360, background: "#fff", borderRadius: 12, overflow: "hidden", textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" },
  image: { width: "100%", height: 200, objectFit: "cover" },
  title: { fontSize: 22, fontWeight: "bold", margin: "15px 0", color: "#000" },
  input: { width: "100%", padding: 12, borderRadius: 8, border: "1px solid #ccc", marginBottom: 15, boxSizing: "border-box" },
  button: { width: "100%", padding: 14, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, fontWeight: "bold", cursor: "pointer" },
  disclaimer: { fontSize: 10, color: "#9ca3af", padding: 15 }
};
