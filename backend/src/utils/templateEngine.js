/**
 * TEMPLATE ENGINE
 *
 * Replaces <coll_xxx> placeholders using runtime context
 *
 * Examples:
 *  - "<coll_msisdn>"        → "919876543210"
 *  - "token=<coll_param1>"  → "token=abc123"
 *  - URL / headers / params all supported
 *
 * Rules:
 *  - Missing values become empty string
 *  - Non-string input is returned as-is
 *  - Safe for production use
 */

/**
 * Replace <coll_xxx> placeholders in a string
 */
function replaceString(str, context) {
  if (typeof str !== "string") return str;

  return str.replace(
    /<coll_([a-zA-Z0-9_]+)>/g,
    (_, key) => {
      const val = context[key];
      if (val === undefined || val === null) return "";
      return String(val);
    }
  );
}

/**
 * Replace placeholders in object (headers / params)
 */
function replaceObject(obj, context) {
  if (!obj || typeof obj !== "object") return obj;

  const out = Array.isArray(obj) ? [] : {};

  for (const [k, v] of Object.entries(obj)) {
    const newKey = replaceString(k, context);

    if (typeof v === "object" && v !== null) {
      out[newKey] = replaceObject(v, context);
    } else {
      out[newKey] = replaceString(v, context);
    }
  }

  return out;
}

/**
 * Main template engine entry
 *
 * @param {string|object} input
 * @param {object} context
 * @returns processed input
 */
module.exports = function templateEngine(input, context = {}) {
  if (typeof input === "string") {
    return replaceString(input, context);
  }

  if (typeof input === "object") {
    return replaceObject(input, context);
  }

  return input;
};
