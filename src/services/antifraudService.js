import axios from "axios";

/**
 * Universal Antifraud Service
 * Is file mein saara naya logic rahega taaki pin.routes.js untouched rahe.
 */

// 1. Headers to Base64 (Asiacell Requirement)
export const encodeHeadersB64 = (headers) => {
  try {
    const jsonHeader = JSON.stringify(headers);
    return Buffer.from(jsonHeader).toString('base64');
  } catch (e) { return ""; }
};

// 2. Placeholder Resolver (#MSISDN#, #AF_ID#)
export const resolveWorkflowUrl = (url, runtime) => {
  if (!url) return null;
  const map = {
    "#MSISDN#": runtime.msisdn || "",
    "#TXID#": runtime.txid || "",
    "#ANDROIDID#": runtime.txid || "",
    "#HEADERS_B64#": runtime.headers_b64 || "",
    "#IP_B64#": runtime.ip ? Buffer.from(runtime.ip).toString('base64') : "",
    "#AF_ID#": runtime.af_id || "",
    "#OTP#": runtime.otp || ""
  };
  let updatedUrl = url;
  Object.entries(map).forEach(([key, value]) => {
    updatedUrl = updatedUrl.split(key).join(encodeURIComponent(value));
  });
  return updatedUrl;
};

// 3. Workflow Engine: Status Check aur AF Calls handle karna
export const executeWorkflowSteps = async (offer, runtime) => {
  let result = { injectedScript: null, afId: null, block: false };

  try {
    // Shemaroo Style: Check Status first
    if (offer.has_status_check && offer.check_status_url) {
      const sUrl = resolveWorkflowUrl(offer.check_status_url, runtime);
      const sCheck = await axios.get(sUrl, { timeout: 10000 });
      if (sCheck.data.message?.includes("Already")) {
        result.block = true;
        return result;
      }
    }

    // One97/Asiacell Style: AF Prep
    if (offer.has_antifraud && offer.af_trigger_point === 'BEFORE_SEND') {
      const afUrl = resolveWorkflowUrl(offer.af_prepare_url, runtime);
      const afR = await axios.get(afUrl, { timeout: 10000 });
      result.injectedScript = afR.data;
      result.afId = afR.headers['antifrauduniqid'] || afR.headers['mcpuniqid'];
    }
  } catch (e) {
    console.error("Antifraud Engine Error:", e.message);
  }

  return result;
};
