import React, { useState, useEffect } from "react";
import apiClient from "../api/apiClient";

export default function Publishers() {
  const [publishers, setPublishers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [form, setForm] = useState({
    id: null,
    name: "",
    email: "",
    postback_url: "",
    status: "active",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/publishers");
      setPublishers(res.data || []);
      setFiltered(res.data || []);
    } catch (err) {
      console.error("Fetch publishers failed:", err);
      alert("⚠️ Failed to fetch publishers. Check backend API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!search.trim()) setFiltered(publishers);
    else {
      const lower = search.toLowerCase();
      setFiltered(publishers.filter((p) => p.name.toLowerCase().includes(lower)));
    }
  }, [search, publishers]);

  const handleSubmit = async () => {
    if (!form.name.trim()) return alert("⚠️ Name is required!");
    try {
      if (isEditing) {
        await apiClient.put(`/publishers/${form.id}`, form);
        alert("✅ Publisher updated!");
      } else {
        const res = await apiClient.post("/publishers", form);
        alert(`✅ Publisher created!\nAPI Key: ${res.data.api_key}`);
      }
      resetForm();
      fetchData();
    } catch (err) {
      console.error("Submit error:", err);
      alert("⚠️ Error saving publisher");
    }
  };

  const resetForm = () => {
    setForm({
      id: null,
      name: "",
      email: "",
      postback_url: "",
      status: "active",
    });
    setIsEditing(false);
  };

  const editPublisher = (p) => {
    setForm(p);
    setIsEditing(true);
  };

  const toggleStatus = async (p) => {
    const newStatus = p.status === "active" ? "inactive" : "active";
    try {
      await apiClient.put(`/publishers/${p.id}`, { ...p, status: newStatus });
      setPublishers((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, status: newStatus } : x))
      );
    } catch (err) {
      console.error("Toggle status failed:", err);
      alert("⚠️ Failed to change status");
    }
  };

  const regenerateKey = async (id) => {
    try {
      const res = await apiClient.post(`/publishers/${id}/regenerate-key`);
      alert(`✅ New API Key: ${res.data.api_key}`);
      fetchData();
    } catch (err) {
      alert("⚠️ Failed to regenerate key");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Publishers</h2>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          className="border p-2 rounded w-56"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="border p-2 rounded w-56"
          placeholder="Email (optional)"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="border p-2 rounded w-72"
          placeholder="Postback URL (optional)"
          value={form.postback_url}
          onChange={(e) => setForm({ ...form, postback_url: e.target.value })}
        />
        <select
          className="border p-2 rounded w-40"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={handleSubmit}
        >
          {isEditing ? "Update" : "Add Publisher"}
        </button>
      </div>

      {isEditing && (
        <button onClick={resetForm} className="mb-3 text-red-500 underline">
          Cancel Edit
        </button>
      )}

      <div className="mb-3">
        <input
          type="text"
          placeholder="🔍 Search publisher by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded w-1/3"
        />
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="min-w-full bg-white rounded shadow text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Postback</th>
              <th className="p-2 text-left">API Key</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="p-2">{p.name}</td>
                <td className="p-2">{p.email || "-"}</td>
                <td className="p-2">{p.postback_url || "-"}</td>
                <td className="p-2 font-mono bg-gray-50">{p.api_key}</td>
                <td className="p-2">
                  <button
                    onClick={() => toggleStatus(p)}
                    className={`px-3 py-1 rounded text-white ${
                      p.status === "active" ? "bg-green-600" : "bg-gray-500"
                    } hover:opacity-90`}
                  >
                    {p.status === "active" ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="p-2">
                  <button
                    onClick={() => editPublisher(p)}
                    className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => regenerateKey(p.id)}
                    className="bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
                  >
                    Regenerate Key
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
