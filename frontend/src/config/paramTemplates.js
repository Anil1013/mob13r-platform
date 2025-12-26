/**
 * PARAM_TEMPLATES
 *
 * Used for:
 * - UI hints
 * - Documentation
 * - Publisher / advertiser clarity
 *
 * NOTE:
 * - key MUST match <coll_key>
 * - label is UI-only (safe to change)
 */

export const PARAM_TEMPLATES = [
  /* ================= CORE ================= */
  { key: "msisdn", label: "MSISDN (User Mobile Number)" },
  { key: "transaction_id", label: "Transaction ID" },
  { key: "uuid_trxid", label: "UUID Transaction ID" },
  { key: "pin", label: "User PIN / OTP" },

  /* ================= DEVICE / NETWORK ================= */
  { key: "ip", label: "Caller IP Address" },
  { key: "user_ip", label: "User IP Address" },
  { key: "ua", label: "User Agent" },
  { key: "base64_ua", label: "Base64 Encoded User Agent" },

  /* ================= CAMPAIGN ================= */
  { key: "cid", label: "Campaign ID (cid)" },
  { key: "cmpid", label: "Campaign ID (cmpid)" },
  { key: "offid", label: "Offer ID (offid)" },

  /* ================= PUBLISHER FREE PARAMS ================= */
  { key: "param1", label: "Publisher Param 1" },
  { key: "param2", label: "Publisher Param 2" },
  { key: "param3", label: "Publisher Param 3" },
  { key: "param4", label: "Publisher Param 4" },

  /* ================= FRAUD ================= */
  { key: "anti_fraud_id", label: "Anti-Fraud ID" },
];
