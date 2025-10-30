// frontend/src/api/apiClient.js
import axios from "axios";

const apiClient = axios.create({
  baseURL: "https://backend.mob13r.com/api",
  timeout: 15000,
});

// ✅ Har request pe latest key bhejo
apiClient.interceptors.request.use((config) => {
  const key = localStorage.getItem("mob13r_api_key") || "";
  if (key) {
    config.headers["X-API-Key"] = key;               // primary
    config.headers["Authorization"] = `Bearer ${key}`; // fallback
  } else {
    // ensure we don't send empty header
    delete config.headers["X-API-Key"];
    delete config.headers["Authorization"];
  }
  return config;
});

// (optional) 401/403 pe UI ko signal do
apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    const s = err?.response?.status;
    if (s === 401 || s === 403) {
      window.dispatchEvent(new CustomEvent("mob13r:bad-key"));
    }
    return Promise.reject(err);
  }
);

export default apiClient;
