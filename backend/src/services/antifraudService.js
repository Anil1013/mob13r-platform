import axios from "axios";

/* =====================================================
   🛠️ UTILITY: HEADERS KO BASE64 ME ENCODE KARNA
===================================================== */
export const encodeHeadersB64 = (headers) => {
  try {
    return Buffer.from(JSON.stringify(headers)).toString("base64");
  } catch (e) { 
    console.error("B64 Encoding Error:", e.message);
    return ""; 
  }
};

/* =====================================================
   🔗 URL RESOLVER: PLACEHOLDERS KO ACTUAL DATA SE BADALNA
===================================================== */
export const resolveWorkflowUrl = (url, runtime) => {
  if (!url) return null;

  const hashMap = {
    "#MSISDN#": runtime.msisdn || "",
    "#TXID#": runtime.txid || runtime.transaction_id || "",
    "#ANDROIDID#": runtime.android_id || "", // FIXED: Ab ye sahi field pick karega
    "#HEADERS_B64#": runtime.headers_b64 || "",
    "#IP_B64#": runtime.ip ? Buffer.from(runtime.ip).toString("base64") : "",
    "#AF_ID#": runtime.af_id || "",
    "#OTP#": runtime.otp || "",
    "#UNIQID#": runtime.uniqid || "",
    "#SESSION_KEY#": runtime.sessionKey || runtime.session_key || "",
  };

  let updatedUrl = url;

  // 1. Standard Hash Placeholders Badle (#KEY#)
  Object.entries(hashMap).forEach(([key, value]) => {
    updatedUrl = updatedUrl.split(key).join(encodeURIComponent(value));
  });

  // 2. Dynamic Braces Placeholders Badle ({key})
  updatedUrl = updatedUrl.replace(/\{(.*?)\}/g, (_, key) => {
    return encodeURIComponent(runtime[key] ?? "");
  });

  return updatedUrl;
};

/* =====================================================
   🛡️ ANTIFRAUD HANDLERS (MCP, ONE97, GENERIC)
===================================================== */

async function handleMCPAntifraud(offer, runtime) {
  if (!offer.af_prepare_url) return { injectedScript: null, afId: null };
  try {
    const afUrl = resolveWorkflowUrl(offer.af_prepare_url, runtime);
    const afR = await axios.get(afUrl, { timeout: 8000 }); // 8s timeout for faster response

    // Extracting Unique ID from Headers or Body
    const afId =
      afR.headers["mcpuniqid"] ||
      afR.headers["antifrauduniqid"] ||
      afR.headers["x-uniqid"] ||
      afR.data?.uniqid ||
      afR.data?.uniqueId ||
      null;

    // Extracting JS Script
    const injectedScript =
      typeof afR.data === "string" ? afR.data : afR.data?.script || afR.data?.js || null;

    return { injectedScript, afId };
  } catch (e) {
    console.error("MCP Antifraud Error:", e.message);
    return { injectedScript: null, afId: null };
  }
}

async function handleONE97Antifraud(offer, runtime) {
  if (!offer.af_prepare_url) return { injectedScript: null, afId: null };
  try {
    const afUrl = resolveWorkflowUrl(offer.af_prepare_url, runtime);
    const afR = await axios.post(afUrl, {
      partnerId: runtime.partner_id || "",
      sessionId: runtime.session_id || runtime.transaction_id || "",
      operatorId: runtime.operator_id || "",
      msisdn: runtime.msisdn || "",
      additionalData: "{}",
    }, { timeout: 8000 });

    const afId = afR.data?.sessionId || afR.data?.afId || null;
    const injectedScript = afR.data?.script || afR.data?.js || null;

    return { injectedScript, afId };
  } catch (e) {
    console.error("ONE97 Antifraud Error:", e.message);
    return { injectedScript: null, afId: null };
  }
}

async function handleGenericAntifraud(offer, runtime) {
  if (!offer.af_prepare_url) return { injectedScript: null, afId: null };
  try {
    const afUrl = resolveWorkflowUrl(offer.af_prepare_url, runtime);
    const afR = await axios.get(afUrl, { timeout: 8000 });

    const afId =
      afR.headers["antifrauduniqid"] ||
      afR.headers["x-af-id"] ||
      afR.data?.afId ||
      afR.data?.id ||
      null;

    const injectedScript =
      typeof afR.data === "string" ? afR.data : afR.data?.script || afR.data?.js || null;

    return { injectedScript, afId };
  } catch (e) {
    console.error("Generic Antifraud Error:", e.message);
    return { injectedScript: null, afId: null };
  }
}

/* =====================================================
   🚀 MAIN WORKFLOW ENGINE
===================================================== */
export const executeWorkflowSteps = async (offer, runtime) => {
  let result = { injectedScript: null, afId: null, block: false };

  try {
    // 1. Status Check (Pehle se subscribed hai ya nahi)
    if (offer.has_status_check && offer.check_status_url) {
      const sUrl = resolveWorkflowUrl(offer.check_status_url, runtime);
      const sCheck = await axios.get(sUrl, { timeout: 5000 });
      
      const body = sCheck.data;
      const bodyStr = JSON.stringify(body).toLowerCase();

      // Check for common subscription keywords
      if (
        bodyStr.includes("already") ||
        bodyStr.includes("subscribed") ||
        bodyStr.includes("active") ||
        body?.status === "active" ||
        body?.subscribed === true
      ) {
        result.block = true; // User already subscribed, block the flow
        return result;
      }
    }

    // 2. Antifraud Handling (BEFORE_SEND point)
    if (offer.has_antifraud && offer.af_trigger_point === "BEFORE_SEND") {
      const antifraudType = (offer.antifraud_type || "GENERIC").toUpperCase();
      let afResult = { injectedScript: null, afId: null };

      if (antifraudType === "MCP") {
        afResult = await handleMCPAntifraud(offer, runtime);
      } else if (antifraudType === "ONE97") {
        afResult = await handleONE97Antifraud(offer, runtime);
      } else {
        afResult = await handleGenericAntifraud(offer, runtime);
      }

      result.injectedScript = afResult.injectedScript;
      result.afId = afResult.afId;
    }

  } catch (e) {
    console.error("Workflow Engine Error:", e.message);
  }

  return result;
};
