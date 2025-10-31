import axios from "axios";

const apiClient = axios.create({
  baseURL: "https://backend.mob13r.com/api",
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("mob13r_token");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  } else {
    delete config.headers["Authorization"];
  }
  return config;
});

export default apiClient;
