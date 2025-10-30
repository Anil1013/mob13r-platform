import React, { useState } from "react";

export default function ApiKeyPrompt({ onSave }) {
  const [key, setKey] = useState("");

  const handleSave = () => {
    if (!key.trim()) return alert("Please enter key");
    localStorage.setItem("mob13r_api_key", key);
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white p-6 rounded shadow w-96">
        <h2 className="text-lg font-semibold mb-3">Enter API Key</h2>

        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          type="text"
          placeholder="Paste API key here"
          className="border w-full p-2 rounded"
        />

        <button
          onClick={handleSave}
          className="mt-3 bg-blue-600 text-white w-full py-2 rounded"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
}
