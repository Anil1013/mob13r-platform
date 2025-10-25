import axios from "axios";

// ✅ Use your live backend base URL
const BASE_URL = "https://backend.mob13r.com/api";

// Create reusable axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// ✅ =====================
// Publisher API Functions
// =====================

// Fetch all publishers
export const fetchPublishers = async () => {
  const response = await api.get("/publishers");
  return response.data;
};

// Create a new publisher
export const createPublisher = async (data) => {
  const response = await api.post("/publishers", data);
  return response.data;
};

// Update publisher
export const updatePublisher = async (id, data) => {
  const response = await api.put(`/publishers/${id}`, data);
  return response.data;
};

// Delete publisher
export const deletePublisher = async (id) => {
  const response = await api.delete(`/publishers/${id}`);
  return response.data;
};

// ✅ =====================
// Advertiser API Functions
// =====================

// Fetch all advertisers
export const fetchAdvertisers = async () => {
  const response = await api.get("/advertisers");
  return response.data;
};

// Create a new advertiser
export const createAdvertiser = async (data) => {
  const response = await api.post("/advertisers", data);
  return response.data;
};

// Update advertiser
export const updateAdvertiser = async (id, data) => {
  const response = await api.put(`/advertisers/${id}`, data);
  return response.data;
};

// Delete advertiser
export const deleteAdvertiser = async (id) => {
  const response = await api.delete(`/advertisers/${id}`);
  return response.data;
};

// ✅ Default export (for generic requests)
export default api;
