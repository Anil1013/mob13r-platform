/**
 * NOTE:
 * Frontend NEVER calls telco/operator APIs directly.
 * All execution flows go via BACKEND only.
 */

const API_URL = import.meta.env.VITE_API_URL;

// 🔐 Helper
const getToken = () => localStorage.getItem("token");

/* =====================================================
   GET ALL OFFERS
   GET /api/offers
===================================================== */
export const getOffers = async () => {
  const res = await fetch(`${API_URL}/api/offers`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch offers");
  }

  return res.json();
};

/* =====================================================
   CREATE OFFER
   POST /api/offers
===================================================== */
export const createOffer = async (offer) => {
  const res = await fetch(`${API_URL}/api/offers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(offer),
  });

  if (!res.ok) {
    throw new Error("Failed to create offer");
  }

  return res.json();
};

/* =====================================================
   UPDATE OFFER (FUTURE USE)
   PUT /api/offers/:id
===================================================== */
export const updateOffer = async (id, offer) => {
  const res = await fetch(`${API_URL}/api/offers/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(offer),
  });

  if (!res.ok) {
    throw new Error("Failed to update offer");
  }

  return res.json();
};

/* =====================================================
   TOGGLE OFFER STATUS (Active / Paused)
   PATCH /api/offers/:id/status
===================================================== */
export const toggleOfferStatus = async (id) => {
  const res = await fetch(`${API_URL}/api/offers/${id}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to toggle offer status");
  }

  return res.json();
};

/* =====================================================
   DELETE OFFER
   DELETE /api/offers/:id
===================================================== */
export const deleteOffer = async (id) => {
  const res = await fetch(`${API_URL}/api/offers/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to delete offer");
  }

  return res.json();
};

/* =====================================================
   EXECUTION FLOWS (BACKEND ONLY)
===================================================== */

/* 🔁 PIN SEND */
export const executePinSend = async (offerId, payload) => {
  const res = await fetch(
    `${API_URL}/api/offers/${offerId}/pin-send`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    throw new Error("PIN Send failed");
  }

  return res.json();
};

/* 🔁 PIN VERIFY */
export const executePinVerify = async (offerId, payload) => {
  const res = await fetch(
    `${API_URL}/api/offers/${offerId}/pin-verify`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    throw new Error("PIN Verify failed");
  }

  return res.json();
};

/* 🔁 STATUS CHECK */
export const checkStatus = async (offerId, payload) => {
  const res = await fetch(
    `${API_URL}/api/offers/${offerId}/status-check`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    throw new Error("Status check failed");
  }

  return res.json();
};
