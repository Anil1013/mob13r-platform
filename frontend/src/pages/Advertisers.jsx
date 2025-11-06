import React, { useState, useEffect } from "react";
import apiClient from "../api/apiClient";

export default function Advertisers() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [ads, setAds] = useState([]);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAds = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/advertisers");
      setAds(res.data);
    } catch (err) {
      console.error("Error fetching advertisers:", err);
      alert("Unable to load advertisers. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  const saveAdvertiser = async () => {
    if (!name.trim() || !email.trim()) return alert("Enter name and email");

    try {
      setLoading(true);
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
      fetchAds();
    } catch (err) {
      console.error("Error saving advertiser:", err);
      alert("❌ Error saving advertiser");
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
      setLoading(true);
      await apiClient.delete(`/advertisers/${id}`);
      fetchAds();
    } catch (err) {
      alert("❌ Error deleting advertiser");
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

      <div className="grid grid-cols-4 gap-2 mb-4 max-w-xl">
        <input className="border p-2 rounded" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="border p-2 rounded" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="border p-2 rounded" placeholder="Website" value={website} onChange={(e) => setWebsite(e.target.value)} />
        <button onClick={saveAdvertiser} disabled={loading} className={`px-4 py-2 rounded text-white ${loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}>
          {editId ? "Update" : "Add"}
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
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
                <td className="p-2">
                  <a href={a.website} className="text-blue-600 underline" target="_blank" rel="noreferrer">
                    {a.website}
                  </a>
                </td>
                <td className="p-2">
                  <button onClick={() => editAdvertiser(a)} className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 mr-2">
                    Edit
                  </button>
                  <button onClick={() => deleteAdvertiser(a.id)} className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">
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
