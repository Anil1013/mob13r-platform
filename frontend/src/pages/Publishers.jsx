import React, { useState, useEffect } from "react";
import apiClient from "../api/apiClient";

export default function Publishers() {
  const [form, setForm] = useState({ name: "", email: "", website: "" });
  const [pubs, setPubs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPubs = async () => {
    try {
      const res = await apiClient.get("/publishers");
      setPubs(res.data);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to load publishers");
    }
    setLoading(false);
  };

  const createPublisher = async () => {
    if (!form.name || !form.email) return alert("Name & Email required");

    try {
      const res = await apiClient.post("/publishers", form);
      alert(`✅ Publisher created!\nAPI Key: ${res.data.api_key}`);

      setForm({ name: "", email: "", website: "" });
      fetchPubs();
    } catch (err) {
      console.log(err);
      alert("❌ Error creating publisher");
    }
  };

  const regenKey = async (id) => {
    if (!window.confirm("Regenerate API Key? Old key will stop working.")) return;

    try {
      const res = await apiClient.post(`/publishers/${id}/regenerate-key`);
      alert(`✅ New API Key: ${res.data.api_key}`);
      fetchPubs();
    } catch {
      alert("❌ Failed to regenerate key");
    }
  };

  useEffect(() => { fetchPubs(); }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Publishers</h2>

      {/* Input Form */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <input
          className="border p-2 rounded"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Name"
        />
        <input
          className="border p-2 rounded"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="Email"
        />
        <input
          className="border p-2 rounded"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          placeholder="Website"
        />
        <button onClick={createPublisher} className="bg-green-600 text-white rounded px-3">
          Add Publisher
        </button>
      </div>

      {/* Table */}
      <table className="min-w-full bg-white rounded shadow text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Email</th>
            <th className="p-2 text-left">Website</th>
            <th className="p-2 text-left">API Key</th>
            <th className="p-2 text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          {pubs.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="p-2">{p.name}</td>
              <td className="p-2">{p.email}</td>
              <td className="p-2">{p.website || "-"}</td>
              <td className="p-2 font-mono text-xs bg-gray-50">{p.api_key}</td>
              <td className="p-2 text-center">
                <button
                  className="bg-blue-500 text-white text-xs px-2 py-1 rounded"
                  onClick={() => regenKey(p.id)}
                >
                  Regenerate Key
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
