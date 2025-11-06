import React, { useState, useEffect } from "react";
import apiClient from "../api/apiClient";

export default function Advertisers() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [ads, setAds] = useState([]);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ Fetch all advertisers
  const fetchAds = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/advertisers");
      setAds(res.data);
    } catch (err) {
      console.error("Error fetching advertisers:", err);
      alert("❌ Unable to load advertisers. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Create or update advertiser
  const saveAdvertiser = async () => {
    if (!name.trim()) return alert("Please enter advertiser name");
    if (!email.trim()) return alert("Please enter email");

    try {
      setLoading(true);
      if (editId) {
        // Update existing advertiser
        await apiClient.put(`/advertisers/${editId}`, { name, email, website });
        alert("✅ Advertiser updated successfully!");
      } else {
        // Create new advertiser
        await apiClient.post("/advertisers", { name, email, website });
        alert("✅ Advertiser created successfully!");
      }

      // Reset form
      setName("");
      setEmail("");
      setWebsite("");
      setEditId(null);

      // Refresh list
      fetchAds();
    } catch (err) {
      console.error("Error saving advertiser:", err);

      if (err?.response?.status === 400 && err.response.data?.error === "Email already exists") {
        alert("⚠️ Email already exists. Please use a different one.");
      } else {
        alert("❌ Server error while saving advertiser.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Load advertiser into form for editing
  const editAdvertiser = (a) => {
    setEditId(a.id);
    setName(a.name);
    setEmail(a.email);
    setWebsite(a.website);
  };

  // ✅ Delete advertiser
  const deleteAdvertiser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this advertiser?")) return;

    try {
      setLoading(true);
      await apiClient.delete(`/advertisers/${id}`);
      alert("🗑️ Advertiser deleted.");
      fetchAds();
    } catch (err) {
      console.error("Error deleting advertiser:", err);
      alert("❌ Failed to delete advertiser.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Advertisers</h2>

      {/* Form */}
      <div className="mb-4 grid grid-cols-4 gap-2 max-w-xl">
        <input
          className="border p-2 rounded"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="border p-2 rounded"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="border p-2 rounded"
          placeholder="Website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />

        <button
          disabled={loading}
          onClick={saveAdvertiser}
          className={`${
            loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          } text-white px-4 py-2 rounded`}
        >
          {editId ? "Update" : "Add"}
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <table className="min-w-full bg-white rounded shadow text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Website</th>
              <th className="p-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {ads.map((a) => (
              <tr key={a.id} className="border-b">
                <td className="p-2">{a.name}</td>
                <td className="p-2">{a.email}</td>
                <td className="p-2 text-blue-600 underline">
                  <a href={a.website} target="_blank" rel="noreferrer">
                    {a.website}
                  </a>
                </td>
                <td className="p-2 space-x-2">
                  <button
                    onClick={() => editAdvertiser(a)}
                    className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteAdvertiser(a.id)}
                    className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                  >
                    Del
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
