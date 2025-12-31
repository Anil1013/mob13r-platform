/* =====================================================
   Advertiser Response Mapper
   SINGLE SOURCE OF TRUTH
===================================================== */

/* ================= PIN SEND ================= */
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

  /* ✅ SUCCESS */
  if (advData.status === true) {
    return {
      httpCode: 200,
      isSuccess: true,
      body: {
        status: "OTP_SENT",
        adv_response: advData,
      },
    };
  }

  /* ❌ FAILURE (pass-through advertiser reason) */
  return {
    httpCode: 400,
    isSuccess: false,
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

/* ================= PIN VERIFY ================= */
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

  /* ✅ VERIFIED */
  if (advData.status === true) {
    return {
      httpCode: 200,
      isSuccess: true,
      body: {
        status: "SUCCESS",
        adv_response: advData,
      },
    };
  }

  /* ❌ WRONG OTP / FAILED */
  return {
    httpCode: 400,
    isSuccess: false,
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
