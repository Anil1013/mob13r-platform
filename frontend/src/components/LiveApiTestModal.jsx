import { useState } from "react";

/* =====================================================
   STEP → API ENDPOINT MAP
===================================================== */
const STEP_API_MAP = {
  status_check: "status-check",
  pin_send: "pin-send",
  pin_verify: "pin-verify",
  anti_fraud: "anti-fraud",
};

export default function LiveApiTestModal({
  open,
  onClose,
  offerId,
  step,
}) {
  const [payload, setPayload] = useState(`{
  "msisdn": "",
  "pin": "",
  "user_ip": "",
  "ua": "",
  "param1": "",
  "param2": ""
}`);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (!open || !step) return null;

  const runTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let body;

      try {
        body = JSON.parse(payload);
      } catch {
        throw new Error("Invalid JSON payload");
      }

      const endpoint = STEP_API_MAP[step];
      if (!endpoint) {
        throw new Error(`Unknown step: ${step}`);
      }

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/offers/${offerId}/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (res.status === 401) {
        localStorage.clear();
        window.location.href = "/login";
        return;
      }

      const data = await res.json();

      setResult({
        status: res.status,
        data,
      });
    } catch (err) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
      <div className="bg-[#0b1220] text-white w-[900px] max-h-[90vh] rounded-xl shadow-lg overflow-hidden">
        {/* ================= HEADER ================= */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold">
            Live API Test —{" "}
            <span className="text-blue-400">{step}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* ================= BODY ================= */}
        <div className="grid grid-cols-2 gap-4 p-6 overflow-y-auto max-h-[75vh]">
          {/* REQUEST */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-white/80">
              Request Payload (JSON)
            </h3>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              rows={14}
              className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* RESPONSE */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-white/80">
              Response
            </h3>

            {loading && (
              <div className="text-blue-400 text-sm">
                Running test...
              </div>
            )}

            {error && (
              <div className="text-red-400 text-sm">
                {error}
              </div>
            )}

            {result && (
              <pre
                className={`text-sm p-3 rounded-lg font-mono overflow-auto ${
                  result.data?.success
                    ? "bg-green-900/30 text-green-300"
                    : "bg-red-900/30 text-red-300"
                }`}
              >
{JSON.stringify(result, null, 2)}
              </pre>
            )}

            {!loading && !result && !error && (
              <div className="text-white/40 text-sm">
                Click <b>Run Test</b> to see live response
              </div>
            )}
          </div>
        </div>

        {/* ================= FOOTER ================= */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20"
          >
            Close
          </button>
          <button
            onClick={runTest}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            Run Live Test
          </button>
        </div>
      </div>
    </div>
  );
}
