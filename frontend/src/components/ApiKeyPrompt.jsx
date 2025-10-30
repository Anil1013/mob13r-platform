import React, { useState, useEffect } from "react";

export default function ApiKeyPrompt({ onSave }) {
  const [key, setKey] = useState(localStorage.getItem("mob13r_api_key") || "");
  const [error, setError] = useState("");

  const saveKey = () => {
    if (!key.trim()) {
      setError("API key cannot be empty");
      return;
    }

    localStorage.setItem("mob13r_api_key", key.trim());
    setError("");
    onSave(); // trigger validation in App.jsx
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") saveKey();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-white">
          Enter Admin API Key
        </h2>

        <input
          type="text"
          placeholder="Paste API key here"
          className="w-full border p-2 rounded bg-gray-100 dark:bg-gray-700 
          text-gray-900 dark:text-white"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={handleKeyPress}
        />

        {error && (
          <p className="text-red-500 text-sm mt-2">{error}</p>
        )}

        <button
          className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded font-medium"
          onClick={saveKey}
        >
          Save Key
        </button>

        <p className="text-xs text-gray-500 mt-3 text-center">
          You can change this key anytime from Settings
        </p>
      </div>
    </div>
  );
}
