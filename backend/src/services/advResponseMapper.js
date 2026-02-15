/* =====================================================
   🔥 UNIVERSAL ADVERTISER RESPONSE MAPPER
   Fully Dynamic – Works with ANY advertiser
   ===================================================== */

/* ================= JSON SAFE ACCESS ================= */

function get(obj, path) {
  if (!obj || !path) return undefined;
  return path.split(".").reduce((acc, part) => {
    if (!acc) return undefined;
    return acc[part];
  }, obj);
}

/* ================= SMART SUCCESS DETECTOR ================= */

function detectSuccess(advData) {
  if (!advData) return false;

  // Common patterns
  if (advData.status === true) return true;
  if (advData.status === "true") return true;
  if (advData.success === true) return true;
  if (advData.code === 200) return true;
  if (advData.response === "Success") return true;

  return false;
}

/* ================= SMART MESSAGE EXTRACTOR ================= */

function extractMessage(advData) {
  return (
    advData?.message ||
    advData?.msg ||
    advData?.errorMessage ||
    advData?.err?.errorMessage ||
    advData?.err?.msg ||
    ""
  );
}

/* ================= SESSION KEY EXTRACTOR ================= */

function extractSessionKey(advData) {
  return (
    advData?.sessionKey ||
    advData?.session_key ||
    advData?.txnId ||
    advData?.transaction_id ||
    null
  );
}

/* ================= PORTAL URL EXTRACTOR ================= */

function extractPortalUrl(advData) {
  return (
    advData?.portal_url ||
    advData?.redirect_url ||
    advData?.url ||
    null
  );
}

/* =====================================================
   📤 PIN SEND MAPPER
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

  const isSuccess = detectSuccess(advData);
  const message = extractMessage(advData);
  const sessionKey = extractSessionKey(advData);

  return {
    httpCode: isSuccess ? 200 : 400,
    isSuccess,
    body: {
      status: isSuccess ? "OTP_SENT" : "OTP_FAILED",
      message,
      session_key: sessionKey,
      adv_response: advData
    }
  };
}

/* =====================================================
   🔐 PIN VERIFY MAPPER
===================================================== */

export function mapPinVerifyResponse(advData) {
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

  const isSuccess = detectSuccess(advData);
  const message = extractMessage(advData);
  const portalUrl = extractPortalUrl(advData);

  return {
    httpCode: isSuccess ? 200 : 400,
    isSuccess,
    body: {
      status: isSuccess ? "SUCCESS" : "OTP_INVALID",
      message,
      ...(portalUrl ? { portal_url: portalUrl } : {}),
      adv_response: advData
    }
  };
}

/* =====================================================
   📊 STATUS CHECK MAPPER
===================================================== */

export function mapStatusResponse(advData) {
  if (!advData) {
    return {
      httpCode: 502,
      isSuccess: false,
      body: {
        status: "UNKNOWN",
        message: "No response from advertiser",
        adv_response: null
      }
    };
  }

  const isSuccess = detectSuccess(advData);
  const message = extractMessage(advData);

  return {
    httpCode: 200,
    isSuccess,
    body: {
      status: isSuccess ? "ACTIVE" : "INACTIVE",
      message,
      adv_response: advData
    }
  };
}

/* =====================================================
   🔗 PORTAL MAPPER
===================================================== */

export function mapPortalResponse(advData) {
  if (!advData) {
    return {
      httpCode: 502,
      isSuccess: false,
      body: {
        status: "FAILED",
        message: "No response from advertiser",
        adv_response: null
      }
    };
  }

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
