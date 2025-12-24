const API_URL = import.meta.env.VITE_API_URL;
const getToken = () => localStorage.getItem("token");

export const getExecutionLogs = async (params = {}) => {
  const query = new URLSearchParams(params).toString();

  const res = await fetch(
    `${API_URL}/api/offer-executions?${query}`,
    {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch execution logs");
  }

  return res.json();
};
