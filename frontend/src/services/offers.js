const API_URL = import.meta.env.VITE_API_URL;

const getToken = () => localStorage.getItem("token");

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

const jsonAuthHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

/* ================= GET ALL OFFERS ================= */
export const getOffers = async () => {
  const res = await fetch(`${API_URL}/api/offers`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

/* ================= GET OFFER BY ID (IMPORTANT) ================= */
export const getOfferById = async (id) => {
  const res = await fetch(`${API_URL}/api/offers/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

/* ================= CREATE ================= */
export const createOffer = async (payload) => {
  const res = await fetch(`${API_URL}/api/offers`, {
    method: "POST",
    headers: jsonAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

/* ================= UPDATE ================= */
export const updateOffer = async (id, payload) => {
  const res = await fetch(`${API_URL}/api/offers/${id}`, {
    method: "PUT",
    headers: jsonAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

/* ================= DELETE ================= */
export const deleteOffer = async (id) => {
  const res = await fetch(`${API_URL}/api/offers/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
};

/* ================= STATUS TOGGLE ================= */
export const toggleOfferStatus = async (id) => {
  const res = await fetch(`${API_URL}/api/offers/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

/* ================= EXECUTION ================= */
export const checkStatus = (id, p) =>
  fetch(`${API_URL}/api/offers/${id}/status-check`, {
    method: "POST",
    headers: jsonAuthHeaders(),
    body: JSON.stringify(p),
  }).then((r) => r.json());

export const executePinSend = (id, p) =>
  fetch(`${API_URL}/api/offers/${id}/pin-send`, {
    method: "POST",
    headers: jsonAuthHeaders(),
    body: JSON.stringify(p),
  }).then((r) => r.json());

export const executePinVerify = (id, p) =>
  fetch(`${API_URL}/api/offers/${id}/pin-verify`, {
    method: "POST",
    headers: jsonAuthHeaders(),
    body: JSON.stringify(p),
  }).then((r) => r.json());
