import React, { useState, useEffect } from "react";
import apiClient from "../api/apiClient";

export default function ApiDocs() {
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    // fetch API key from backend
    const loadKey = async () => {
      try {
        const res = await apiClient.get("/admin/apikey");
        setApiKey(res.data.key);
      } catch {
        console.log("No key yet");
      }
    };
    loadKey();
  }, []);

  const generateKey = async () => {
    const res = await apiClient.post("/admin/apikey");
    setApiKey(res.data.key);
  };

  const baseURL = "https://backend.mob13r.com/api";

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Publisher API Access</h2>

      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Your API Key</h3>

        {apiKey ? (
          <div className="flex gap-3">
            <input className="border p-2 flex-1 rounded bg-gray-100 dark:bg-gray-700" value={apiKey} readOnly />
            <button className="bg-blue-600 text-white px-3 py-2 rounded"
              onClick={() => navigator.clipboard.writeText(apiKey)}>
              Copy
            </button>
          </div>
        ) : (
          <button onClick={generateKey} className="bg-green-600 text-white px-4 py-2 rounded">
            Generate API Key
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
        <h3 className="text-xl font-semibold mb-4">API Endpoints</h3>

        <pre className="bg-gray-900 text-green-400 p-4 rounded-md text-sm overflow-auto">
GET {baseURL}/offers?api_key=YOUR_KEY
GET {baseURL}/postback?click_id={"{id}"}&status=approved
POST {baseURL}/click
{`{
  "publisher_id": "123",
  "offer_id": "55",
  "sub1": "value"
}`}

        </pre>

      </div>
    </div>
  );
}
