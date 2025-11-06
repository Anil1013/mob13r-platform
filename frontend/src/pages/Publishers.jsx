import React, { useState, useEffect } from "react";
import apiClient from "../api/apiClient";

export default function Publishers() {
  const [publishers, setPublishers] = useState([]);
  const [form, setForm] = useState({
    id: null,
    name: "",
    email: "",
    website: "",
    hold_percent: 20,
  });
  const [isEditing, setIsEditing] = useState(false);

  // ✅ Fetch all publishers
  const fetchData = async () => {
    try {
      const res = await apiClient.get("/publishers");
      setPublishers(res.data || []);
    } catch (err) {
      console.error("Fetch publishers failed:", err);
      alert("⚠️ Failed to fetch publishers. Check backend API.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ✅ Add or update
  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.website)
      return alert("⚠️ All fields are required!");

    try {
      if (isEditing) {
        await apiClient.put(`/publishers/${form.id}`, form);
        alert("✅ Publisher updated successfully!");
      } else {
        const res = await apiClient.post("/publishers", form);
        alert(`✅ Publisher created\nAPI Key: ${res.data?.api_key || "N/A"}`);
      }
      resetForm();
      fetchData();
    } catch (err) {
      console.error("Submit error:", err);
      alert("⚠️ Error: " + (err.response?.data?.error || err.message));
    }
  };

  const resetForm = () => {
    setForm({ id: null, name: "", email: "", website: "", hold_percent: 20 });
    setIsEditing(false);
  };

  const editPublisher = (p) => {
    setForm(p);
    setIsEditing(true);
  };

  const deletePublisher = async (id) => {
    if (!window.confirm("Delete this publisher?")) return;
    try {
      await apiClient.delete(`/publishers/${id}`);
      fetchData();
    } catch (err) {
      alert("⚠️ Failed to delete publisher: " + err.response?.data?.error);
    }
  };

  const regenerateKey = async (id) => {
    try {
      const res = await apiClient.post(`/publishers/${id}/regenerate-key`);
      alert(`✅ New API Key: ${res.data?.api_key}`);
      fetchData();
    } catch (err) {
      alert("⚠️ Failed to regenerate key: " + err.response?.data?.error);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Publishers</h2>

      {/* FORM */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        <input
          className="border p-2 rounded"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="border p-2 rounded"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="border p-2 rounded"
          placeholder="Website"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
        />
        <input
          className="border p-2 rounded"
          type="number"
          placeholder="Hold %"
          value={form.hold_percent}
          onChange={(e) =>
            setForm({ ...form, hold_percent: Number(e.target.value) })
          }
        />
        <button
          className="bg-green-600 text-white p-2 rounded hover:bg-green-700"
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

      {/* LIST */}
      <table className="min-w-full bg-white rounded shadow text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Name</th>
            <th className="p-2">Email</th>
            <th className="p-2">Website</th>
            <th className="p-2">Hold %</th>
            <th className="p-2">API Key</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {publishers.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="p-2">{p.name}</td>
              <td className="p-2">{p.email}</td>
              <td className="p-2">{p.website}</td>
              <td className="p-2">{p.hold_percent}%</td>
              <td className="p-2 font-mono text-xs bg-gray-50">{p.api_key}</td>
              <td className="p-2 flex gap-2">
                <button
                  className="text-blue-600 underline"
                  onClick={() => editPublisher(p)}
                >
                  Edit
                </button>
                <button
                  className="text-red-600 underline"
                  onClick={() => deletePublisher(p.id)}
                >
                  Delete
                </button>
                <button
                  className="text-green-600 underline"
                  onClick={() => regenerateKey(p.id)}
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
