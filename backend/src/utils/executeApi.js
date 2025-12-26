/**
 * EXECUTE API
 *
 * Responsible for:
 * - Making external API calls (telco / operator / partner)
 * - Supporting GET / POST
 * - Handling params vs body correctly
 * - Evaluating success_matcher
 *
 * Used by:
 * - offer-execution.routes.js
 */

const fetch = require("node-fetch");

/* =====================================================
   SUCCESS MATCHER EVALUATOR
===================================================== */

/**
 * Evaluate success matcher
 *
 * matcher examples:
 *  - "status:true"
 *  - "\"success\":true"
 *  - "code=0"
 *  - "OK"
 *
 * Rule:
 * - matcher empty → success = true
 * - matcher string must be found in response (stringified)
 */
function evaluateSuccess(response, matcher) {
  if (!matcher || !matcher.trim()) {
    return true;
  }

  try {
    const responseText = JSON.stringify(response);
    return responseText.includes(matcher);
  } catch {
    return false;
  }
}

/* =====================================================
   MAIN EXECUTOR
===================================================== */

/**
 * Execute external API
 *
 * @param {Object} options
 * @param {String} options.method  - GET / POST
 * @param {String} options.url
 * @param {Object} options.headers
 * @param {Object} options.params  - query params (GET) or body (POST)
 * @param {String} options.successMatcher
 *
 * @returns {Object}
 *  {
 *    success: boolean,
 *    response: object,
 *    status: number
 *  }
 */
export default async function executeApi({
  method = "GET",
  url,
  headers = {},
  params = {},
  successMatcher = "",
}) {
  if (!url) {
    throw new Error("Execution URL is missing");
  }

  const httpMethod = method.toUpperCase();
  let finalUrl = url;
  let body;

  /* ================= GET ================= */
  if (httpMethod === "GET") {
    const qs = new URLSearchParams(params).toString();
    if (qs) {
      finalUrl += (finalUrl.includes("?") ? "&" : "?") + qs;
    }
  }

  /* ================= POST ================= */
  if (httpMethod === "POST") {
    body = JSON.stringify(params);

    // Auto-set content-type if missing
    if (
      !headers["Content-Type"] &&
      !headers["content-type"]
    ) {
      headers["Content-Type"] = "application/json";
    }
  }

  /* ================= FETCH ================= */
  const res = await fetch(finalUrl, {
    method: httpMethod,
    headers,
    body,
    timeout: 20000, // 20s safety timeout
  });

  let responseData;
  const text = await res.text();

  try {
    responseData = JSON.parse(text);
  } catch {
    responseData = text;
  }

  /* ================= SUCCESS CHECK ================= */
  const success =
    res.ok && evaluateSuccess(responseData, successMatcher);

  return {
    success,
    status: res.status,
    response: responseData,
  };
};
