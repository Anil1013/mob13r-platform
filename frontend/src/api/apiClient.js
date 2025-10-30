import axios from "axios";

const apiClient = axios.create({
  baseURL: "https://backend.mob13r.com/api",
});

// ✅ Add API key automatically
apiClient.interceptors.request.use((config) => {
  config.headers["x-api-key"] = localStorage.getItem("admin_key") || "";
  return config;
});

export default apiClient;
