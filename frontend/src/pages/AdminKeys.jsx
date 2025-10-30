import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";
import { Trash2, PlusCircle } from "lucide-react";

export default function AdminKeys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadKeys = async () => {
    try {
      const res = await apiClient.get("/admin/apikey");
      setKeys(res.data);
    } catch (err) {
      console.error("Error fetching keys:", err);
    } finally {
      setLoading(false);
    }
  };

  const createKey = async () => {
    const res = await apiClient.post("/admin/apikey");
    const key = res.data.api_key;

    // ✅ Save API key to browser localStorage
    localStorage.setItem("admin_key", key);

    alert("✅ New API key created and saved!");
    loadKeys();
    window.location.reload(); // Refresh dashboard auto-auth
  };

  const deleteKey = async (id) => {
    if (!window.confirm("Delete this API key?")) return;
    await apiClient.delete(`/admin/apikey/${id}`);

    // ✅ Clear localStorage if the active key was deleted
    const activeKey = localStorage.getItem("admin_key");
    const removedKey = keys.find(k => k.id === id)?.api_key;
    if (removedKey === activeKey) {
      localStorage.removeItem("admin_key");
      alert("⚠️ Deleted active key. Login again.");
      window.location.href = "/admin-keys";
      return;
    }

    loadKeys();
  };

  useEffect(() => {
    loadKeys();
  }, []);

  if (loading) return <p>Loading keys...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-white">
          Admin API Keys
        </h2>
        <button
          onClick={createKey}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          <PlusCircle size={18} /> New Key
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded shadow p-4">
        {keys.length === 0 ? (
          <p className="text-gray-500">No keys yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2">API Key</th>
                <th className="text-left py-2">Created At</th>
                <th className="text-right py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-2 font-mono text-xs">{k.api_key}</td>
                  <td className="py-2">{new Date(k.created_at).toLocaleString()}</td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => deleteKey(k.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
