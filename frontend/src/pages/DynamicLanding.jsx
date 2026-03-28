import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

export default function DynamicLanding() {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [msisdn, setMsisdn] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("input");

  useEffect(() => {
    fetch(`/api/landing/${id}`)
      .then(res => res.json())
      .then(res => setData(res.data));
  }, [id]);

  if (!data) return <div>Loading...</div>;

  const sendPin = async () => {
    const res = await fetch(
      `/api/publisher/pin/send?offer_id=${data.offer_id}&msisdn=${msisdn}`
    );

    const json = await res.json();
    localStorage.setItem("session_token", json.session_token);
    setStep("otp");
  };

  const verifyPin = async () => {
    const token = localStorage.getItem("session_token");

    const res = await fetch(
      `/api/publisher/pin/verify?session_token=${token}&otp=${otp}`
    );

    const json = await res.json();

    if (json.status === "SUCCESS") {
      alert("Success");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>{data.title}</h1>
      <p>{data.description}</p>

      {data.image_url && (
        <img src={data.image_url} alt="" width="100%" />
      )}

      {step === "input" && (
        <>
          <input placeholder="Enter Number"
            onChange={e => setMsisdn(e.target.value)} />
          <button onClick={sendPin}>Send OTP</button>
        </>
      )}

      {step === "otp" && (
        <>
          <input placeholder="Enter OTP"
            onChange={e => setOtp(e.target.value)} />
          <button onClick={verifyPin}>Verify</button>
        </>
      )}

      <p>{data.disclaimer}</p>
    </div>
  );
}
