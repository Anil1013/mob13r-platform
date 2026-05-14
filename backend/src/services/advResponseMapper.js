/* =====================================================
   🌍 UNIVERSAL ADVERTISER RESPONSE MAPPER (v3.0)
   - Auto-detects SUCCESS, STATUS, RESPONSE keys
   - Handles Zain IQ & Other Global Advertisers
   - Logic: Success First Priority, Then Failure Check
===================================================== */

/**
 * 🔎 DEEP SEARCH: Objects ke andar nested keys dhoondne ke liye
 */
function deepSearch(obj, matcher) {
  if (!obj || typeof obj !== "object") return null;

  for (const key in obj) {
    const value = obj[key];

    if (matcher(key, value)) return value;

    if (typeof value === "object" && value !== null) {
      const nested = deepSearch(value, matcher);
      if (nested !== null) return nested;
    }
  }
  return null;
}

/**
 * ✅ SUCCESS AUTO DETECTOR: Advertiser ka response success hai ya nahi
 */
function detectSuccess(data) {
  if (!data) return false;

  const successKeywords = ["success", "ok", "sent", "generated", "activated", "verified", "otp_sent", "pin_sent"];
  const failKeywords = ["fail", "failed", "error", "invalid", "denied", "blocked", "expired", "incorrect"];

  // 1. Boolean & Specific String Check (Primary Check)
  // Isme "response" key add ki gayi hai jo Zain IQ use karta hai
  const boolSuccess = deepSearch(data, (k, v) => 
    ["success", "status", "result", "response"].includes(k.toLowerCase()) && 
    (v === true || v === "true" || (typeof v === 'string' && v.toLowerCase() === "success"))
  );
  if (boolSuccess) return true;

  // 2. Numeric Status Code Check (Secondary Check)
  const code = deepSearch(data, (k, v) =>
    ["code", "statuscode", "responsecode", "errorcode"].includes(k.toLowerCase()) &&
    (v === 0 || v === 200 || v === "0" || v === "200")
  );
  if (code !== null) return true;

  // 3. String-based Status Check
  const statusVal = deepSearch(data, (k) => k.toLowerCase() === "status");
  if (typeof statusVal === "string") {
    const sv = statusVal.toLowerCase();
    if (successKeywords.includes(sv)) return true;
    if (failKeywords.includes(sv)) return false;
  }

  // 4. Global Keyword Search (Last Resort)
  // "Success" ko pehle priority di gayi hai
  const rawMessage = JSON.stringify(data).toLowerCase();
  if (successKeywords.some((k) => rawMessage.includes(k))) return true;
  if (failKeywords.some((k) => rawMessage.includes(k))) return false;

  return false;
}

/**
 * 💬 MESSAGE EXTRACTOR
 */
function extractMessage(data) {
  const msg = deepSearch(data, (k) =>
    ["message", "msg", "description", "statusmessage", "errormessage", "responsetext"].includes(k.toLowerCase())
  );
  return msg || "No message from advertiser";
}

/**
 * 🔑 SESSION KEY / TRANSACTION ID EXTRACTOR
 */
function extractSessionKey(data) {
  return deepSearch(data, (k) =>
    ["sessionkey", "session_key", "transactionid", "transaction_id", "txnid", "requestid", "referenceid", "refid", "txid"].includes(k.toLowerCase())
  );
}

/**
 * 🔗 PORTAL URL EXTRACTOR
 */
function extractPortalUrl(data) {
  return deepSearch(data, (k, v) =>
    typeof v === "string" &&
    v.startsWith("http") &&
    (k.toLowerCase().includes("url") || k.toLowerCase().includes("redirect") || k.toLowerCase().includes("portal"))
  );
}

/* =====================================================
   📤 EXPORTED MAPPING FUNCTIONS
===================================================== */

export function mapPinSendResponse(advData) {
  if (!advData) return { httpCode: 502, isSuccess: false, body: { status: "ADV_NO_RESPONSE", message: "No response from advertiser", adv_response: null } };

  const success = detectSuccess(advData);
  const message = extractMessage(advData);
  const sessionKey = extractSessionKey(advData);

  return {
    httpCode: success ? 200 : 400,
    isSuccess: success,
    body: {
      status: success ? "OTP_SENT" : "OTP_FAILED",
      message,
      session_key: sessionKey || null,
      adv_response: advData
    }
  };
}

export function mapPinVerifyResponse(advData) {
  if (!advData) return { httpCode: 502, isSuccess: false, body: { status: "ADV_NO_RESPONSE", message: "No advertiser response" } };

  const success = detectSuccess(advData);
  const message = extractMessage(advData);
  const portalUrl = extractPortalUrl(advData);

  return {
    httpCode: success ? 200 : 400,
    isSuccess: success,
    body: {
      status: success ? "SUCCESS" : "OTP_INVALID",
      message,
      ...(portalUrl ? { portal_url: portalUrl } : {}),
      adv_response: advData
    }
  };
}

export function mapStatusResponse(advData) {
  const success = detectSuccess(advData);
  const message = extractMessage(advData);
  return {
    httpCode: 200,
    isSuccess: success,
    body: {
      status: success ? "ACTIVE" : "INACTIVE",
      message,
      adv_response: advData
    }
  };
}

export function mapPortalResponse(advData) {
  const portalUrl = extractPortalUrl(advData);
  const message = extractMessage(advData);
  return {
    httpCode: portalUrl ? 200 : 400,
    isSuccess: !!portalUrl,
    body: {
      status: portalUrl ? "REDIRECT" : "FAILED",
      message,
      portal_url: portalUrl,
      adv_response: advData
    }
  };
}
