/**
 * OFFER_API_SCHEMA
 *
 * This schema drives:
 * - OfferForm (UI generation)
 * - OfferConfig (view-only flow)
 * - OfferExecute (step enable/disable)
 * - Backend execution order
 *
 * NOTE:
 * - Keys MUST match backend step handlers
 * - Templates MUST match <coll_xxx> usage
 */

export const OFFER_API_SCHEMA = {
  status_check: {
    label: "Status Check",
    description: "Check subscription / eligibility status",
    default: {
      enabled: true,
      method: "GET",
      url: "",
      headers: {},
      params: {},
      success_matcher: "",
    },
    templates: [
      "msisdn",
      "transaction_id",
      "ip",
      "user_ip",
      "ua",
      "cid",
      "param1",
      "param2",
    ],
  },

  pin_send: {
    label: "PIN Send",
    description: "Generate OTP / PIN",
    default: {
      enabled: true,
      method: "POST",
      url: "",
      headers: {
        "Content-Type": "application/json",
      },
      params: {},
      success_matcher: "",
    },
    templates: [
      "msisdn",
      "transaction_id",
      "uuid_trxid",
      "user_ip",
      "ua",
      "cid",
      "param1",
      "param2",
    ],
  },

  pin_verify: {
    label: "PIN Verify",
    description: "Verify OTP / PIN",
    default: {
      enabled: true,
      method: "POST",
      url: "",
      headers: {
        "Content-Type": "application/json",
      },
      params: {},
      success_matcher: "",
    },
    templates: [
      "msisdn",
      "transaction_id",
      "pin",
      "user_ip",
      "ua",
      "cid",
      "param1",
      "param2",
    ],
  },

  anti_fraud: {
    label: "Anti-Fraud",
    description: "Optional fraud detection step",
    default: {
      enabled: false,
      method: "POST",
      url: "",
      headers: {},
      params: {},
      success_matcher: "",
    },
    templates: [
      "msisdn",
      "transaction_id",
      "anti_fraud_id",
      "ip",
      "ua",
    ],
  },
};
