/**
 * Publisher Response Mapper
 *
 * RULES:
 * 1. PIN SEND  -> Advertiser response 그대로 forward
 * 2. PIN VERIFY
 *    - ADV FAIL -> same response
 *    - ADV SUCCESS + HOLD ->
 *         30% INVALID_PIN
 *         70% ALREADY_SUBSCRIBED
 */

export function mapPublisherResponse(internalData, options = {}) {
  const { isHold = false } = options;

  if (!internalData || !internalData.status) {
    return {
      status: "FAILED",
      message: "Invalid response from system",
    };
  }

  /* ================= HOLD CASE ================= */
  if (isHold) {
    const rand = Math.random() * 100;

    if (rand < 30) {
      return {
        status: "INVALID_PIN",
        message: "Invalid or expired PIN",
      };
    }

    return {
      status: "ALREADY_SUBSCRIBED",
      message: "User already subscribed",
    };
  }

  /* ================= NORMAL FLOW ================= */
  // Advertiser ka response 그대로 publisher ko
  return {
    status: internalData.status,
    message: internalData.message || "",
    ...(internalData.extra || {}),
  };
}
