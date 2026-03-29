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

  const urlParams = new URLSearchParams(window.location.search);
  const apiKey = urlParams.get("api_key");

  useEffect(() => {
    fetch(`${API_BASE}/api/landing/${id}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.status === "SUCCESS") {
          setLanding(res.data);
        } else {
          setLanding(false);
        }
      })
      .catch(() => setLanding(false));
  }, [id]);

  if (landing === null) return <div style={styles.center}>Loading...</div>;
  if (landing === false) return <div style={styles.center}>Not Found</div>;

  const detectGeoCarrier = (msisdn) => {
    const num = msisdn.replace(/\D/g, "");

    if (num.startsWith("96478")) return { geo: "IQ", carrier: "Asiacell" };
    if (num.startsWith("96477")) return { geo: "IQ", carrier: "Zain" };

    return { geo: "IQ", carrier: "Zain" }; // fallback
  };

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
      alert(data.message);
    }
  };

  const verifyPin = async () => {
    const res = await fetch(
      `${API_BASE}/api/publisher/pin/verify?session_token=${sessionToken}&otp=${otp}&x-api-key=${apiKey}`
    );

    const data = await res.json();

    if (data.status === "SUCCESS") {
      window.location.href = data.portal_url || "/";
    } else {
      alert(data.message);
    }
  };

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
            <button style={styles.button} onClick={sendPin}>
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
            <button style={styles.button} onClick={verifyPin}>
              Verify OTP
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "#f3f4f6",
  },
  center: {
    textAlign: "center",
    marginTop: 100,
  },
  card: {
    background: "#fff",
    padding: 30,
    borderRadius: 10,
    width: 320,
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: 10,
    marginBottom: 10,
  },
  button: {
    width: "100%",
    padding: 10,
    background: "#22c55e",
    color: "#fff",
    border: "none",
    borderRadius: 6,
  },
  image: {
    width: "100%",
    marginBottom: 10,
  },
};
