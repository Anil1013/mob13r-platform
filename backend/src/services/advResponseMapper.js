/* =====================================================
   🌍 UNIVERSAL ADVERTISER RESPONSE MAPPER
   AUTO-DETECTS ANY ADVERTISER FORMAT
   Works with Unlimited Advertisers
===================================================== */


/* =====================================================
   🔎 SAFE OBJECT WALKER (DEEP SEARCH)
===================================================== */

function deepSearch(obj, matcher) {
  if (!obj || typeof obj !== "object") return null;

  for (const key in obj) {
    const value = obj[key];

    if (matcher(key, value)) return value;

    if (typeof value === "object") {
      const nested = deepSearch(value, matcher);
      if (nested !== null) return nested;
    }
  }

  return null;
}


/* =====================================================
   ✅ SUCCESS AUTO DETECTOR
===================================================== */

function detectSuccess(data) {
  if (!data) return false;

  const successKeywords = [
    "success",
    "ok",
    "sent",
    "generated",
    "activated",
    "verified"
  ];

  const failKeywords = [
    "fail",
    "failed",
    "error",
    "invalid",
    "denied",
    "blocked"
  ];

  /* Boolean success */
  const boolSuccess = deepSearch(
    data,
    (k, v) =>
      ["success", "status", "result"].includes(k.toLowerCase()) &&
      (v === true || v === "true")
  );

  if (boolSuccess) return true;

  /* Numeric success */
  const code = deepSearch(
    data,
    (k, v) =>
      ["code", "statuscode", "responsecode"].includes(
        k.toLowerCase()
      ) &&
      (v === 0 || v === 200 || v === "0" || v === "200")
  );

  if (code !== null) return true;

  /* Message based detection */
  const message = JSON.stringify(data).toLowerCase();

  if (successKeywords.some(k => message.includes(k)))
    return true;

  if (failKeywords.some(k => message.includes(k)))
    return false;

  return false;
}


/* =====================================================
   💬 MESSAGE AUTO EXTRACTOR
===================================================== */

function extractMessage(data) {

  const msg = deepSearch(data, (k) =>
    [
      "message",
      "msg",
      "description",
      "statusmessage",
      "errormessage"
    ].includes(k.toLowerCase())
  );

  return msg || "No message";
}


/* =====================================================
   🔑 SESSION KEY AUTO DETECTOR
===================================================== */

function extractSessionKey(data) {

  return deepSearch(data, (k) =>
    [
      "sessionkey",
      "session_key",
      "transactionid",
      "transaction_id",
      "txnid",
      "requestid",
      "referenceid",
      "refid"
    ].includes(k.toLowerCase())
  );
}


/* =====================================================
   🔗 PORTAL URL AUTO DETECTOR
===================================================== */

function extractPortalUrl(data) {

  return deepSearch(data, (k, v) =>
    typeof v === "string" &&
    (
      k.toLowerCase().includes("url") ||
      v.startsWith("http")
    )
  );
}


/* =====================================================
   📤 PIN SEND RESPONSE
===================================================== */

export function mapPinSendResponse(advData) {

  if (!advData) {
    return {
      httpCode: 502,
      isSuccess: false,
      body: {
        status: "ADV_NO_RESPONSE",
        message: "No response from advertiser",
        adv_response: null
      }
    };
  }

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


/* =====================================================
   🔐 PIN VERIFY RESPONSE
===================================================== */

export function mapPinVerifyResponse(advData) {

  if (!advData) {
    return {
      httpCode: 502,
      isSuccess: false,
      body: {
        status: "ADV_NO_RESPONSE",
        message: "No advertiser response"
      }
    };
  }

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


/* =====================================================
   📊 STATUS RESPONSE
===================================================== */

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


/* =====================================================
   🔗 PORTAL RESPONSE
===================================================== */

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
