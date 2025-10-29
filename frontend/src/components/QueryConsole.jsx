import React, { useState } from "react";
import apiClient from "../api/apiClient";

export default function QueryConsole({ open, onClose }) {
  const [sql, setSql] = useState("SELECT * FROM publishers LIMIT 5;");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const runQuery = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await apiClient.post("/query", { sql });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg w-full max-w-3xl shadow-lg border border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-xl mb-3 dark:text-white">Database Query Console</h2>

        <textarea
          rows={6}
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-700 p-3 rounded-lg text-sm font-mono bg-gray-50 dark:bg-gray-800 dark:text-gray-200"
          placeholder="Type your SELECT query..."
        />

        <div className="mt-4 flex gap-3">
          <button
            onClick={runQuery}
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? "Running..." : "Run Query"}
          </button>
          <button onClick={onClose} className="border px-4 py-2 rounded-lg dark:text-white">
            Close
          </button>
        </div>

        {error && <div className="text-red-600 dark:text-red-400 mt-4">{error}</div>}

        {result && (
          <pre className="bg-gray-100 dark:bg-gray-800 p-3 mt-4 max-h-64 overflow-auto text-sm rounded-lg text-gray-800 dark:text-gray-200">
            {JSON.stringify(result.rows, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
