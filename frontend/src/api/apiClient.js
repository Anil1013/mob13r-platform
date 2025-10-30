import axios from "axios";

// 🔑 Load key from localStorage
const apiKey = localStorage.getItem("mob13r_api_key");

const apiClient = axios.create({
  baseURL: "https://backend.mob13r.com/api",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": apiKey || ""
  }
});

// ✅ Auto-attach key on every request (if key updated later)
apiClient.interceptors.request.use((config) => {
  config.headers["X-API-Key"] = localStorage.getItem("mob13r_api_key") || "";
  return config;
});

export default apiClient;
