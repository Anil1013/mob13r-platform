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

/* ================= GET ALL OFFERS ================= */
export const getOffers = async () => {
  const res = await fetch(`${API_URL}/api/offers`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
};

/* ================= CREATE OFFER ================= */
export const createOffer = async (offer) => {
  const res = await fetch(`${API_URL}/api/offers`, {
    method: "POST",
    headers: jsonAuthHeaders(),
    body: JSON.stringify(offer),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
};

/* ================= UPDATE OFFER ================= */
export const updateOffer = async (id, offer) => {
  const res = await fetch(`${API_URL}/api/offers/${id}`, {
    method: "PUT",
    headers: jsonAuthHeaders(),
    body: JSON.stringify(offer),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
};

/* ================= TOGGLE OFFER STATUS ================= */
export const toggleOfferStatus = async (id) => {
  const res = await fetch(`${API_URL}/api/offers/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
};

/* ================= DELETE OFFER ================= */
export const deleteOffer = async (id) => {
  const res = await fetch(`${API_URL}/api/offers/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
};

/* =====================================================
   OFFER EXECUTION ENGINE (GENERIC & FLEXIBLE)
===================================================== */

/**
 * payload can contain ANY advertiser params:
 * msisdn (required)
 * user_ip OR ip
 * ua
 * pub_id
 * sub_pub_id
 * transaction_id (if any)
 */

/* ================= STATUS CHECK ================= */
export const checkStatus = async (offerId, payload = {}) => {
  const res = await fetch(
    `${API_URL}/api/offers/${offerId}/status-check`,
    {
      method: "POST",
      headers: jsonAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
};

/* ================= PIN SEND ================= */
export const executePinSend = async (offerId, payload = {}) => {
  const res = await fetch(
    `${API_URL}/api/offers/${offerId}/pin-send`,
    {
      method: "POST",
      headers: jsonAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
};

/**
 * payload must include:
 * msisdn
 * pin
 * sessionKey (if operator requires)
 */

/* ================= PIN VERIFY ================= */
export const executePinVerify = async (offerId, payload = {}) => {
  const res = await fetch(
    `${API_URL}/api/offers/${offerId}/pin-verify`,
    {
      method: "POST",
      headers: jsonAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
};
