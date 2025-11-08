import React, { useState, useEffect } from "react";
import apiClient from "../api/apiClient";

export default function Advertisers() {
  const [ads, setAds] = useState([]);
  const [filteredAds, setFilteredAds] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("active");
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Fetch advertisers
  const fetchAdvertisers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/advertisers");
      setAds(res.data);
      setFilteredAds(res.data);
    } catch (err) {
      console.error("Fetch advertisers failed:", err);
      alert("❌ Failed to fetch advertisers. Check backend API.");
    } finally {
      setLoading(false);
    }
  };

  // Search advertisers by name
  useEffect(() => {
    if (!search.trim()) {
      setFilteredAds(ads);
    } else {
      const lower = search.toLowerCase();
      setFilteredAds(
        ads.filter((a) => a.name.toLowerCase().includes(lower))
      );
    }
  }, [search, ads]);

  // Save or update advertiser
  const saveAdvertiser = async () => {
    if (!name.trim()) return alert("Enter advertiser name");

    setLoading(true);
    try {
      const payload = { name, email, status };
      if (editId) {
        await apiClient.put(`/advertisers/${editId}`, payload);
        alert("✅ Advertiser updated!");
      } else {
        await apiClient.post("/advertisers", payload);
        alert("✅ Advertiser added!");
      }
      setName("");
      setEmail("");
      setStatus("active");
      setEditId(null);
      fetchAdvertisers();
    } catch (err) {
      alert("❌ Error saving advertiser");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Edit advertiser
  const editAdvertiser = (a) => {
    setEditId(a.id);
    setName(a.name);
    setEmail(a.email || "");
    setStatus(a.status);
  };

  // Toggle status (active/inactive)
  const toggleStatus = async (a) => {
    const newStatus = a.status === "active" ? "inactive" : "active";
    try {
      await apiClient.put(`/advertisers/${a.id}`, {
        name: a.name,
        email: a.email,
        status: newStatus,
      });
      setAds((prev) =>
        prev.map((adv) =>
          adv.id === a.id ? { ...adv, status: newStatus } : adv
        )
      );
    } catch (err) {
      console.error("Toggle status failed:", err);
      alert("❌ Failed to change status");
    }
  };

  useEffect(() => {
    fetchAdvertisers();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Advertisers</h1>

      {/* Form Section */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 rounded w-60"
        />
        <input
          type="email"
          placeholder="Email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded w-60"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border p-2 rounded w-40"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          onClick={saveAdvertiser}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {editId ? "Update" : "Add"}
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="🔍 Search advertiser by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded w-1/3"
        />
      </div>

      {/* Table */}
      {loading ? (
        <p>Loading...</p>
      ) : filteredAds.length === 0 ? (
        <p>No advertisers found</p>
      ) : (
        <table className="min-w-full border rounded shadow">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAds.map((a) => (
              <tr key={a.id} className="border-b">
                <td className="p-2">{a.name}</td>
                <td className="p-2">{a.email || "-"}</td>
                <td className="p-2">
                  <button
                    onClick={() => toggleStatus(a)}
                    className={`px-3 py-1 rounded text-white ${
                      a.status === "active" ? "bg-green-600" : "bg-gray-500"
                    } hover:opacity-90`}
                  >
                    {a.status === "active" ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="p-2">
                  <button
                    onClick={() => editAdvertiser(a)}
                    className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
                  >
                    Edit
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
