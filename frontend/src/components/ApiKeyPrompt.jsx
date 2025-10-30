import React, { useState, useEffect } from "react";

export default function ApiKeyPrompt({ onSave }) {
  const [key, setKey] = useState(localStorage.getItem("mob13r_api_key") || "");

  const saveKey = () => {
    if (!key.trim()) return;
    localStorage.setItem("mob13r_api_key", key.trim());
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">Enter Admin API Key</h2>
        
        <input
          type="text"
          placeholder="Paste your API key here"
          className="w-full border p-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />

        <button
          className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded"
          onClick={saveKey}
        >
          Save Key
        </button>
      </div>
    </div>
  );
}
