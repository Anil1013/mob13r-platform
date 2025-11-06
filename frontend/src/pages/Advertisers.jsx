import React, { useState, useEffect } from "react";
import apiClient from "../api/apiClient";

export default function Advertisers() {
  const [ads, setAds] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAdvertisers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/advertisers");
      setAds(res.data);
    } catch (err) {
      console.error("Fetch advertisers failed:", err);
      alert("❌ Failed to fetch advertisers. Check backend API.");
    } finally {
      setLoading(false);
    }
  };

  const saveAdvertiser = async () => {
    if (!name.trim() || !email.trim()) return alert("Enter name & email");

    setLoading(true);
    try {
      if (editId) {
        await apiClient.put(`/advertisers/${editId}`, { name, email, website });
        alert("✅ Advertiser updated!");
      } else {
        await apiClient.post("/advertisers", { name, email, website });
        alert("✅ Advertiser added!");
      }
      setName("");
      setEmail("");
      setWebsite("");
      setEditId(null);
      fetchAdvertisers();
    } catch (err) {
      alert("❌ Error saving advertiser");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const editAdvertiser = (a) => {
    setEditId(a.id);
    setName(a.name);
    setEmail(a.email);
    setWebsite(a.website);
  };

  const deleteAdvertiser = async (id) => {
    if (!window.confirm("Delete this advertiser?")) return;
    try {
      await apiClient.delete(`/advertisers/${id}`);
      fetchAdvertisers();
    } catch (err) {
      console.error(err);
      alert("❌ Failed to delete advertiser");
    }
  };

  useEffect(() => {
    fetchAdvertisers();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Advertisers</h1>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 rounded w-1/4"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded w-1/4"
        />
        <input
          type="text"
          placeholder="Website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="border p-2 rounded w-1/4"
        />
        <button
          onClick={saveAdvertiser}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {editId ? "Update" : "Add"}
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="min-w-full border rounded shadow">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Website</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ads.map((a) => (
              <tr key={a.id} className="border-b">
                <td className="p-2">{a.name}</td>
                <td className="p-2">{a.email}</td>
                <td className="p-2">
                  <a
                    href={a.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline"
                  >
                    {a.website}
                  </a>
                </td>
                <td className="p-2">
                  <button
                    onClick={() => editAdvertiser(a)}
                    className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteAdvertiser(a.id)}
                    className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
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
  );
}
