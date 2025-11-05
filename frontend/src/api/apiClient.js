import axios from "axios";

const apiClient = axios.create({
  baseURL: "https://backend.mob13r.com/api",
  timeout: 15000,
});

// ✅ Automatically attach token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("mob13r_token");

  config.headers["Content-Type"] = "application/json";

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }

  return config;
});

// ✅ Global 401 handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      console.warn("⚠️ Session expired. Redirecting...");
      localStorage.removeItem("mob13r_token");

      // ✅ Fix: Only redirect if NOT already at login page
      if (!window.location.pathname.includes("login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
