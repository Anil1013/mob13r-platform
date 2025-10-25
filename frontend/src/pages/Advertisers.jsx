import React, { useEffect, useState } from "react";
import {
  fetchAdvertisers,
  createAdvertiser,
  updateAdvertiser,
  deleteAdvertiser,
} from "../api/apiClient";

export default function Advertisers() {
  const [advertisers, setAdvertisers] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", budget: "" });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdvertisers();
  }, []);

  async function loadAdvertisers() {
    setLoading(true);
    try {
      const data = await fetchAdvertisers();
      setAdvertisers(data);
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
        await updateAdvertiser(editing, form);
      } else {
        await createAdvertiser(form);
      }
      setForm({ name: "", email: "", budget: "" });
      setEditing(null);
      await loadAdvertisers();
    } catch (err) {
      console.error("❌ Save failed:", err);
    }
  }

  async function handleDelete(id) {
    if (window.confirm("Delete this advertiser?")) {
      await deleteAdvertiser(id);
      await loadAdvertisers();
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-3xl font-semibold mb-6 text-gray-800">💼 Advertisers</h2>

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
        <input
          type="number"
          placeholder="Budget"
          value={form.budget}
          onChange={(e) => setForm({ ...form, budget: e.target.value })}
          className="border rounded-lg px-3 py-2 w-1/4"
        />
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          {editing ? "Update" : "Add"} Advertiser
        </button>
      </form>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow-md border border-gray-100">
        {loading ? (
          <p className="p-4 text-gray-600">⏳ Loading...</p>
        ) : (
          <table className="min-w-full text-sm text-gray-700">
            <thead className="bg-green-50 text-gray-700 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">ID</th>
                <th className="px-6 py-3 text-left">Name</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Budget</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {advertisers.map((adv) => (
                <tr key={adv.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-3">{adv.id}</td>
                  <td className="px-6 py-3">{adv.name}</td>
                  <td className="px-6 py-3">{adv.email}</td>
                  <td className="px-6 py-3">${adv.budget || "0.00"}</td>
                  <td className="px-6 py-3 space-x-2">
                    <button
                      onClick={() => {
                        setEditing(adv.id);
                        setForm({
                          name: adv.name,
                          email: adv.email,
                          budget: adv.budget,
                        });
                      }}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(adv.id)}
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
