// frontend/src/pages/Publishers.jsx

import React, { useEffect, useState } from "react";
import {
  fetchPublishers,
  createPublisher,
  updatePublisher,
  deletePublisher,
} from "../api/apiClient";

export default function Publishers() {
  const [publishers, setPublishers] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", status: "active" });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublishers();
  }, []);

  async function loadPublishers() {
    setLoading(true);
    try {
      const data = await fetchPublishers();
      setPublishers(data);
    } catch (err) {
      console.error("❌ Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editing) {
        await updatePublisher(editing, form);
      } else {
        await createPublisher(form);
      }
      setForm({ name: "", email: "", status: "active" });
      setEditing(null);
      await loadPublishers();
    } catch (err) {
      console.error("❌ Save failed:", err);
    }
  }

  async function handleDelete(id) {
    if (window.confirm("Delete this publisher?")) {
      await deletePublisher(id);
      await loadPublishers();
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-3xl font-semibold mb-6 text-gray-800">👤 Publishers</h2>

      {/* Add/Edit Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md p-4 rounded-lg mb-6 flex flex-wrap gap-4"
      >
        <input
          type="text"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          className="border rounded-lg px-3 py-2 w-1/4"
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          className="border rounded-lg px-3 py-2 w-1/4"
        />
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="border rounded-lg px-3 py-2 w-1/4"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          {editing ? "Update" : "Add"} Publisher
        </button>
      </form>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow-md border border-gray-100">
        {loading ? (
          <p className="p-4 text-gray-600">⏳ Loading...</p>
        ) : (
          <table className="min-w-full text-sm text-gray-700">
            <thead className="bg-indigo-50 text-gray-700 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">ID</th>
                <th className="px-6 py-3 text-left">Name</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {publishers.map((pub) => (
                <tr key={pub.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-3">{pub.id}</td>
                  <td className="px-6 py-3">{pub.name}</td>
                  <td className="px-6 py-3">{pub.email}</td>
                  <td className="px-6 py-3">{pub.status}</td>
                  <td className="px-6 py-3 space-x-2">
                    <button
                      onClick={() => {
                        setEditing(pub.id);
                        setForm({
                          name: pub.name,
                          email: pub.email,
                          status: pub.status,
                        });
                      }}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(pub.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
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
