import React, { useState, useEffect } from "react";
import apiClient from "../api/apiClient";

export default function Publishers() {
  const [name, setName] = useState("");
  const [pubs, setPubs] = useState([]);

  const fetchPubs = async () => {
    const res = await apiClient.get("/publishers");
    setPubs(res.data);
  };

  const createPublisher = async () => {
    if (!name) return alert("Enter name");
    const res = await apiClient.post("/publishers", { name });
    alert(`✅ Publisher created. API Key: ${res.data.api_key}`);
    setName("");
    fetchPubs();
  };

  useEffect(() => { fetchPubs(); }, []);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Publishers</h2>

      <div className="mb-4 flex gap-2">
        <input
          type="text"
          className="border p-2 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Publisher Name"
        />
        <button onClick={createPublisher} className="bg-green-600 text-white px-4 py-2 rounded">
          Create Publisher
        </button>
      </div>

      <table className="min-w-full bg-white rounded shadow text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Name</th>
            <th className="p-2">API Key</th>
          </tr>
        </thead>
        <tbody>
          {pubs.map(p => (
            <tr key={p.id} className="border-b">
              <td className="p-2">{p.name}</td>
              <td className="p-2 font-mono text-xs bg-gray-50">{p.api_key}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
