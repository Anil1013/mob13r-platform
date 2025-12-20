/**
 * NOTE:
 * Real API calls will go to BACKEND only.
 * Frontend never calls telco APIs directly.
 */

export const getOffers = async () => {
  // later: GET /api/offers
  return [];
};

export const createOffer = async (offer) => {
  // later: POST /api/offers
  console.log("CREATE OFFER:", offer);
  return { success: true };
};

export const updateOffer = async (id, offer) => {
  // later: PUT /api/offers/:id
  console.log("UPDATE OFFER:", id, offer);
  return { success: true };
};

export const executePinSend = async (offer, payload) => {
  // backend will map payload → operator API
  console.log("PIN SEND", offer.id, payload);
};

export const executePinVerify = async (offer, payload) => {
  console.log("PIN VERIFY", offer.id, payload);
};

export const checkStatus = async (offer, payload) => {
  console.log("STATUS CHECK", offer.id, payload);
};
