/* =====================================================
   Advertiser Response Mapper
   Single source of truth for PIN SEND / VERIFY
===================================================== */

export function mapPinSendResponse(advData) {
  if (!advData) {
    return {
      httpCode: 502,
      body: {
        status: "ADV_NO_RESPONSE",
        message: "No response from advertiser",
      },
    };
  }

  // ✅ SUCCESS
  if (advData.status === true) {
    return {
      httpCode: 200,
      body: {
        status: "OTP_SENT",
        session_token: advData.sessionKey || null,
        adv_response: advData,
      },
    };
  }

  // ❌ FAILURE (pass-through)
  return {
    httpCode: 400,
    body: {
      status: "OTP_FAILED",
      message:
        advData.errorMessage ||
        advData.err?.errorMessage ||
        advData.msg ||
        "UNKNOWN_ADV_ERROR",
      adv_response: advData,
    },
  };
}

/* --------------------------------------------------- */

export function mapPinVerifyResponse(advData) {
  if (!advData) {
    return {
      httpCode: 502,
      body: {
        status: "ADV_NO_RESPONSE",
        message: "No response from advertiser",
      },
    };
  }

  // ✅ VERIFIED
  if (advData.status === true) {
    return {
      httpCode: 200,
      body: {
        status: "SUCCESS",
        adv_response: advData,
      },
    };
  }

  // ❌ WRONG OTP / FAILED
  return {
    httpCode: 400,
    body: {
      status: "OTP_INVALID",
      message:
        advData.errorMessage ||
        advData.err?.errorMessage ||
        "OTP_VERIFICATION_FAILED",
      adv_response: advData,
    },
  };
}
