// Keep credentials, OTPs and phone numbers out of server logs.
// (Request payloads to advertisers carry username/password/token/OTP/MSISDN,
// and logging a whole axios error dumps config.params with the same data.)
const SENSITIVE_KEY = /pass(word)?|pwd|secret|token|api[-_]?key|authorization|cookie|credential|otp|^pin$|^code$/i;
const PHONE_KEY = /msisdn|phone|mobile/i;

const maskPhone = (v) => {
  const s = String(v ?? "");
  return s.length <= 6 ? "***" : s.slice(0, 4) + "*".repeat(s.length - 6) + s.slice(-2);
};

export function maskSecrets(value, depth = 0) {
  if (value == null || depth > 5) return value;
  if (Array.isArray(value)) return value.map((v) => maskSecrets(v, depth + 1));
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEY.test(k)) out[k] = "***";
      else if (PHONE_KEY.test(k)) out[k] = maskPhone(v);
      else out[k] = maskSecrets(v, depth + 1);
    }
    return out;
  }
  return value;
}

export function maskUrl(u) {
  try {
    const url = new URL(u);
    for (const k of [...url.searchParams.keys()]) {
      if (SENSITIVE_KEY.test(k) || PHONE_KEY.test(k)) url.searchParams.set(k, "***");
    }
    if (url.username) url.username = "***";
    if (url.password) url.password = "***";
    return url.toString();
  } catch {
    return String(u).replace(/([?&](?:pass(?:word)?|pwd|secret|token|api[-_]?key|otp|code)=)[^&]*/gi, "$1***");
  }
}

// Axios errors carry the full request config (params, headers, data) —
// log just what is useful.
export function describeError(err) {
  if (err?.isAxiosError) {
    return `${err.code || "AXIOS_ERROR"}: ${err.message}${err.response ? ` (HTTP ${err.response.status})` : ""}`;
  }
  return err;
}
