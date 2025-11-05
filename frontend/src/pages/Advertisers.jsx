import React, { useState, useEffect } from "react";
import apiClient from "../api/apiClient";

export default function Advertisers() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [ads, setAds] = useState([]);
  const [editId, setEditId] = useState(null);

  // ✅ Fetch Advertisers
  const fetchAds = async () => {
    try {
      const res = await apiClient.get("/api/advertisers");
      setAds(res.data);
    } catch (err) {
      alert("Error fetching advertisers");
    }
  };

  // ✅ Create / Update Advertiser
  const saveAdvertiser = async () => {
    if (!name) return alert("Name is required");

    try {
      if (editId) {
        // ✅ Update
        await apiClient.put(`/api/advertisers/${editId}`, { name, email, website });
        alert("✅ Advertiser updated");
      } else {
        // ✅ Create
        await apiClient.post("/api/advertisers", { name, email, website });
        alert("✅ Advertiser added");
      }

      setName("");
      setEmail("");
      setWebsite("");
      setEditId(null);
      fetchAds();

    } catch (err) {
      alert("Error saving advertiser");
    }
  };

  // ✅ Fill form for editing
  const editAdvertiser = (a) => {
    setEditId(a.id);
    setName(a.name);
    setEmail(a.email);
    setWebsite(a.website);
  };

  // ✅ Delete advertiser
  const deleteAd = async (id) => {
    if (!window.confirm("Delete advertiser?")) return;

    try {
      await apiClient.delete(`/api/advertisers/${id}`);
      alert("🗑️ Deleted");
      fetchAds();
    } catch {
      alert("Error deleting advertiser");
    }
  };

  useEffect(() => { fetchAds(); }, []);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-4">Advertisers</h2>

      <div className="mb-4 grid grid-cols-4 gap-2 max-w-xl">
        <input className="border p-2 rounded" placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} />
        <input className="border p-2 rounded" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="border p-2 rounded" placeholder="Website" value={website} onChange={(e)=>setWebsite(e.target.value)} />

        <button onClick={saveAdvertiser} className="bg-blue-600 text-white px-4 py-2 rounded">
          {editId ? "Update" : "Add"}
        </button>
      </div>

      <table className="min-w-full bg-white rounded shadow text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Name</th>
            <th className="p-2">Email</th>
            <th className="p-2">Website</th>
            <th className="p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {ads.map(a => (
            <tr key={a.id} className="border-b">
              <td className="p-2">{a.
