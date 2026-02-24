/**
 * =====================================================
 * ✅ UNIVERSAL PUBLISHER RESPONSE MAPPER
 * Stable Session Workflow Version
 * =====================================================
 *
 * FLOW:
 * PIN SEND
 *   → session_token ALWAYS returned
 *
 * PIN VERIFY
 *   ADV FAIL → forward
 *   HOLD     → smart response
 *   SUCCESS  → forward
 *
 * Publisher never loses session_token
 */

export function mapPublisherResponse(
  internalData,
  options = {}
) {
  const { isHold = false } = options;

  /* ================= SAFETY ================= */

  if (!internalData || typeof internalData !== "object") {
    return {
      status: "FAILED",
      message: "Invalid system response",
    };
  }

  const {
    status,
    message,
    session_token,
    portal_url,
    adv_response,
    ...rest
  } = internalData;

  /* =====================================================
     🔐 HOLD LOGIC (VERIFY ONLY)
  ===================================================== */

  if (isHold === true) {

    const rand = Math.random() * 100;

    /* 30% INVALID PIN */
    if (rand < 30) {
      return {
        status: "INVALID_PIN",
        message: "Invalid or expired PIN",
        session_token,
      };
    }

    /* 70% ALREADY SUBSCRIBED */
    return {
      status: "ALREADY_SUBSCRIBED",
      message: "User already subscribed",
      session_token,
    };
  }

  /* =====================================================
     ✅ NORMAL FLOW
  ===================================================== */

  const response = {
    status: status || "FAILED",
    message: message || "",
  };

  /* ✅ ALWAYS RETURN SESSION TOKEN */
  if (session_token) {
    response.session_token = session_token;
  }

  /* ✅ PORTAL AUTO PASS */
  if (portal_url) {
    response.portal_url = portal_url;
  }

  /* ✅ PASS EXTRA SAFE DATA */
  Object.assign(response, rest);

  return response;
}
