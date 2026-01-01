/**
 * Publisher Response Mapper
 *
 * RULES:
 * 1. PIN SEND
 *    → Advertiser response 그대로 forward
 *
 * 2. PIN VERIFY
 *    - ADV FAILED      → same response
 *    - ADV SUCCESS + HOLD
 *         → 30% INVALID_PIN
 *         → 70% ALREADY_SUBSCRIBED
 *    - ADV SUCCESS + PASS
 *         → same response
 */

export function mapPublisherResponse(internalData, options = {}) {
  const { isHold = false } = options;

  /* ================= SAFETY ================= */
  if (!internalData || typeof internalData !== "object") {
    return {
      status: "FAILED",
      message: "Invalid response from system",
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

  /* ================= HOLD CASE (PIN VERIFY ONLY) ================= */
  if (isHold === true) {
    const rand = Math.random() * 100;

    // 🔴 30% INVALID PIN
    if (rand < 30) {
      return {
        status: "INVALID_PIN",
        message: "Invalid or expired PIN",
        session_token,
      };
    }

    // 🟡 70% ALREADY SUBSCRIBED
    return {
      status: "ALREADY_SUBSCRIBED",
      message: "User already subscribed",
      session_token,
    };
  }

  /* ================= NORMAL FLOW ================= */
  // 👉 Advertiser response 그대로 publisher ko
  return {
    status,
    message: message || "",
    ...(session_token ? { session_token } : {}),
    ...(portal_url ? { portal_url } : {}),
    ...rest,
  };
}
