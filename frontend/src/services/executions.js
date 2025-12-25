const API_URL = import.meta.env.VITE_API_URL;

const getToken = () => localStorage.getItem("token");

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

/* =====================================================
   GET EXECUTION LOGS
===================================================== */
export const getExecutionLogs = async (filters = {}) => {
  const params = new URLSearchParams();

  if (filters.offer_id) params.append("offer_id", filters.offer_id);
  if (filters.transaction_id)
    params.append("transaction_id", filters.transaction_id);

  const res = await fetch(
    `${API_URL}/api/execution-logs?${params.toString()}`,
    { headers: authHeaders() }
  );

  if (!res.ok) throw new Error("Failed to fetch execution logs");

  return res.json();
};

/* =====================================================
   DOWNLOAD CSV
===================================================== */
export const downloadExecutionLogsCSV = async (filters = {}) => {
  const params = new URLSearchParams();

  if (filters.offer_id) params.append("offer_id", filters.offer_id);
  if (filters.transaction_id)
    params.append("transaction_id", filters.transaction_id);

  const res = await fetch(
    `${API_URL}/api/execution-logs/export?${params.toString()}`,
    { headers: authHeaders() }
  );

  if (!res.ok) throw new Error("Failed to download CSV");

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "offer_execution_logs.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(url);
};
