/**
 * NOTE:
 * Frontend NEVER calls telco/operator APIs directly.
 * All execution flows go via BACKEND only.
 */

const API_URL = import.meta.env.VITE_API_URL;

/* =====================================================
   🔐 AUTH HELPERS
===================================================== */
const getToken = () => localStorage.getItem("token");

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

const jsonAuthHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

/* =====================================================
   OFFERS CRUD
===================================================== */

/* ================= GET ALL OFFERS =================
   GET /api/offers
===================================================== */
export const getOffers = async () => {
  const res = await fetch(`${API_URL}/api/offers`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch offers");
  }

  return res.json();
};

/* ================= CREATE OFFER =================
   POST /api/offers
===================================================== */
export const createOffer = async (offer) => {
  const res = await fetch(`${API_URL}/api/offers`, {
    method: "POST",
    headers: jsonAuthHeaders(),
    body: JSON.stringify(offer),
  });

  if (!res.ok) {
    throw new Error("Failed to create offer");
  }

  return res.json();
};

/* ================= UPDATE OFFER (FUTURE) =================
   PUT /api/offers/:id
===================================================== */
export const updateOffer = async (id, offer) => {
  const res = await fetch(`${API_URL}/api/offers/${id}`, {
    method: "PUT",
    headers: jsonAuthHeaders(),
    body: JSON.stringify(offer),
  });

  if (!res.ok) {
    throw new Error("Failed to update offer");
  }

  return res.json();
};

/* ================= TOGGLE OFFER STATUS =================
   PATCH /api/offers/:id/status
===================================================== */
export const toggleOfferStatus = async (id) => {
  const res = await fetch(`${API_URL}/api/offers/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to toggle offer status");
  }

  return res.json();
};

/* ================= DELETE OFFER =================
   DELETE /api/offers/:id
===================================================== */
export const deleteOffer = async (id) => {
  const res = await fetch(`${API_URL}/api/offers/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to delete offer");
  }

  return res.json();
};

/* =====================================================
   OFFER EXECUTION ENGINE (REAL FLOW)
===================================================== */

/* ================= STEP 1: STATUS CHECK =================
   POST /api/offers/:id/status-check
   payload → { msisdn, transaction_id? }
   backend auto adds: ip, ua
===================================================== */
export const checkStatus = async (offerId, payload) => {
  const res = await fetch(
    `${API_URL}/api/offers/${offerId}/status-check`,
    {
      method: "POST",
      headers: jsonAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    throw new Error("Status check failed");
  }

  return res.json();
};

/* ================= STEP 2: PIN SEND =================
   POST /api/offers/:id/pin-send
   payload → { msisdn, transaction_id }
===================================================== */
export const executePinSend = async (offerId, payload) => {
  const res = await fetch(
    `${API_URL}/api/offers/${offerId}/pin-send`,
    {
      method: "POST",
      headers: jsonAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    throw new Error("PIN Send failed");
  }

  return res.json();
};

/* ================= STEP 3: PIN VERIFY =================
   POST /api/offers/:id/pin-verify
   payload → { msisdn, pin, transaction_id }
===================================================== */
export const executePinVerify = async (offerId, payload) => {
  const res = await fetch(
    `${API_URL}/api/offers/${offerId}/pin-verify`,
    {
      method: "POST",
      headers: jsonAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    throw new Error("PIN Verify failed");
  }

  return res.json();
};
