import templateEngine from "./templateEngine.js";
/**
 * BUILD PAYLOAD
 *
 * Purpose:
 * - Build headers / params / body objects
 * - Apply <coll_xxx> template replacement
 * - Remove empty keys / values
 *
 * Used by:
 * - offer-execution.routes.js
 */

/**
 * Clean object:
 * - Remove undefined / null keys
 * - Remove empty-string keys
 */
function cleanObject(obj) {
  const out = {};

  Object.entries(obj || {}).forEach(([k, v]) => {
    if (k === "" || k === undefined || k === null) return;
    if (v === undefined || v === null) return;

    // Allow empty string as value only if key is valid
    out[k] = v;
  });

  return out;
}

/**
 * Build payload with template replacement
 *
 * @param {object} source - headers / params template
 * @param {object} context - runtime context (msisdn, pin, param1, etc)
 * @returns {object} processed payload
 */
export default function buildPayload(source = {}, context = {}) {
  if (!source || typeof source !== "object") {
    return {};
  }

  // Step 1: Apply <coll_xxx> replacement
  const templated = templateEngine(source, context);

  // Step 2: Clean empty keys / values
  return cleanObject(templated);
};
