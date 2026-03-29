import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

const API_BASE = "https://backend.mob13r.com";

export default function DynamicLanding() {
  const { id } = useParams();

  const [landing, setLanding] = useState(null);
  const [msisdn, setMsisdn] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("input");
  const [loading, setLoading] = useState(false);
  const [clickId, setClickId] = useState("");

  /* 🔥 CLICK ID */
  useEffect(() => {
    let cid = localStorage.getItem("click_id");

    if (!cid) {
      cid = crypto.randomUUID();
      localStorage.setItem("click_id", cid);
    }

    setClickId(cid);
  }, []);

  /* 🔥 FETCH LANDING */
  useEffect(() => {
    fetch(`${API_BASE}/api/landing/${id}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.status === "SUCCESS") {
          setLanding(res.data);
        } else {
          alert("Landing not found");
        }
      })
      .catch(() => alert("Failed to load landing"));
  }, [id]);

  /* 🔥 GEO DETECT */
  const detectGeoCarrier = (msisdn) => {
    const num = msisdn.replace(/\D/g, "");

    if (num.startsWith("96478")) return { geo: "IQ", carrier: "Zain" };
    if (num.startsWith("96477")) return { geo: "IQ", carrier: "Asiacell" };
    if (num.startsWith("96475")) return { geo: "IQ", carrier: "Korek" };

    if (num.startsWith("97150")) return { geo: "AE", carrier: "Etisalat" };
    if (num.startsWith("97152")) return { geo: "AE", carrier: "Du" };

    if (num.startsWith("9665")) return { geo: "SA", carrier: "STC" };
    if (num.startsWith("96655")) return { geo: "SA", carrier: "Zain" };

    return { geo: "IQ", carrier: "Zain" };
  };

  /* 🔥 SEND PIN */
  const sendPin = async () => {
    if (!msisdn || msisdn.length < 8) {
      return alert("Enter valid mobile number");
    }

    setLoading(true);

    const { geo, carrier } = detectGeoCarrier(msisdn);

    try {
      const res = await fetch(
        `${API_BASE}/api/publisher/pin/send?offer_id=${landing.offer_id}&msisdn=${msisdn}&geo=${geo}&carrier=${carrier}&click_id=${clickId}`,
        {
          headers: {
            "x-api-key": landing.api_key,
          },
        }
      );

      const data = await res.json();

      if (data.session_token) {
        localStorage.setItem("session_token", data.session_token);
        setStep("otp");
      } else {
        alert(data.message || "Failed to send OTP");
      }
    } catch {
      alert("Server error");
    }

    setLoading(false);
  };

  /* 🔥 VERIFY PIN */
  const verifyPin = async () => {
    if (!otp) return alert("Enter OTP");

    setLoading(true);

    const sessionToken = localStorage.getItem("session_token");

    if (!sessionToken) {
      alert("Session expired");
      setStep("input");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/publisher/pin/verify?session_token=${sessionToken}&otp=${otp}&click_id=${clickId}`,
        {
          headers: {
            "x-api-key": landing.api_key,
          },
        }
      );

      const data = await res.json();

      if (data.status === "SUCCESS") {
        const redirectUrl =
          data.portal_url ||
          landing.redirect_url ||
          "https://google.com";

        window.location.href = redirectUrl;
      } else {
        alert(data.message || "Invalid OTP");
      }
    } catch {
      alert("Verification failed");
    }

    setLoading(false);
  };

  if (!landing) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>{landing.title}</h2>
        <p style={styles.desc}>{landing.description}</p>

        {landing.image_url && (
          <img
            src={landing.image_url}
            onError={(e) =>
              (e.target.src =
                "https://via.placeholder.com/300x200?text=No+Image")
            }
            style={styles.image}
          />
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

            <button
              onClick={sendPin}
              style={styles.button}
              disabled={loading}
            >
              {loading ? "Sending..." : landing.button_text || "Send OTP"}
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

            <button
              onClick={verifyPin}
              style={styles.button}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify OTP"}
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
    background: "linear-gradient(135deg,#e0f2fe,#f0fdf4)",
  },
  card: {
    background: "#fff",
    padding: 30,
    borderRadius: 14,
    width: 360,
    textAlign: "center",
    boxShadow: "0 15px 35px rgba(0,0,0,0.1)",
  },
  title: {
    marginBottom: 5,
  },
  desc: {
    fontSize: 14,
    color: "#555",
    marginBottom: 10,
  },
  image: {
    width: "100%",
    borderRadius: 10,
    marginBottom: 15,
    maxHeight: 180,
    objectFit: "cover",
  },
  input: {
    width: "100%",
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    border: "1px solid #ccc",
  },
  button: {
    width: "100%",
    padding: 12,
    background: "#22c55e",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
  },
  disclaimer: {
    fontSize: 12,
    marginTop: 12,
    color: "#777",
  },
};
