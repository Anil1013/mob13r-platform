/* =====================================================
   UNIVERSAL ADVERTISER RESPONSE MAPPER
   Dynamic – No Hardcoding – Future Safe
===================================================== */

/* =====================================================
   🔍 HELPER: Detect Success
===================================================== */
function detectSuccess(data) {
  if (!data) return false;

  // Boolean style
  if (typeof data.status === "boolean") return data.status;

  // String success
  if (typeof data.status === "string") {
    return ["success", "ok", "otp_sent", "verified"].includes(
      data.status.toLowerCase()
    );
  }

  // Mobifyn style
  if (typeof data.response === "string") {
    return data.response.toLowerCase() === "success";
  }

  // HTTP style code
  if (data.code && Number(data.code) === 200) return true;

  return false;
}

/* =====================================================
   🔍 HELPER: Extract Message
===================================================== */
function extractMessage(data) {
  return (
    data?.message ||
    data?.msg ||
    data?.errorMessage ||
    data?.error ||
    data?.description ||
    data?.err?.errorMessage ||
    ""
  );
}

/* =====================================================
   🔍 HELPER: Extract Session Key
===================================================== */
function extractSessionKey(data) {
  return (
    data?.sessionKey ||
    data?.session_key ||
    data?.sessionkey ||
    data?.txnId ||
    data?.transaction_id ||
    null
  );
}

/* =====================================================
   🔍 HELPER: Extract Portal URL
===================================================== */
function extractPortalUrl(data) {
  return (
    data?.portal_url ||
    data?.redirect_url ||
    data?.url ||
    data?.landingUrl ||
    null
  );
}

/* =====================================================
   🔍 HELPER: Extract Status
===================================================== */
function extractStatus(data, successStatus, failStatus) {
  const success = detectSuccess(data);
  return success ? successStatus : failStatus;
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
      },
    };
  }

  const isSuccess = detectSuccess(advData);
  const message = extractMessage(advData);
  const sessionKey = extractSessionKey(advData);

  return {
    httpCode: isSuccess ? 200 : 400,
    isSuccess,
    sessionKey,
    body: {
      status: extractStatus(advData, "OTP_SENT", "OTP_FAILED"),
      message,
      adv_response: advData,
    },
  };
}

/* =====================================================
   ✅ PIN VERIFY MAPPER
===================================================== */
export function mapPinVerifyResponse(advData) {
  if (!advData) {
    return {
      httpCode: 502,
      isSuccess: false,
      body: {
        status: "ADV_NO_RESPONSE",
        message: "No response from advertiser",
      },
    };
  }

  const isSuccess = detectSuccess(advData);
  const message = extractMessage(advData);

  return {
    httpCode: isSuccess ? 200 : 400,
    isSuccess,
    body: {
      status: extractStatus(advData, "SUCCESS", "OTP_INVALID"),
      message,
      adv_response: advData,
    },
  };
}

/* =====================================================
   🔎 STATUS CHECK MAPPER
===================================================== */
export function mapStatusCheckResponse(advData) {
  if (!advData) {
    return {
      httpCode: 502,
      isSuccess: false,
      body: {
        status: "ADV_NO_RESPONSE",
        message: "No response from advertiser",
      },
    };
  }

  const isSuccess = detectSuccess(advData);
  const message = extractMessage(advData);

  return {
    httpCode: 200,
    isSuccess,
    body: {
      status: extractStatus(
        advData,
        "SUBSCRIPTION_ACTIVE",
        "SUBSCRIPTION_INACTIVE"
      ),
      message,
      adv_response: advData,
    },
  };
}

/* =====================================================
   🔗 PORTAL URL MAPPER
===================================================== */
export function mapPortalResponse(advData) {
  if (!advData) {
    return {
      httpCode: 502,
      isSuccess: false,
      body: {
        status: "ADV_NO_RESPONSE",
        message: "No response from advertiser",
      },
    };
  }

  const portalUrl = extractPortalUrl(advData);

  if (!portalUrl) {
    return {
      httpCode: 404,
      isSuccess: false,
      body: {
        status: "PORTAL_NOT_FOUND",
        message: "Portal URL missing",
        adv_response: advData,
      },
    };
  }

  return {
    httpCode: 200,
    isSuccess: true,
    body: {
      status: "PORTAL_READY",
      portal_url: portalUrl,
      adv_response: advData,
    },
  };
}
