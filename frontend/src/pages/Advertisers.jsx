import React, { useState, useEffect } from "react";
import apiClient from "../api/apiClient";

export default function Advertisers() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [ads, setAds] = useState([]);
  const [editId, setEditId] = useState(null);

  const fetchAds = async () => {
    try {
      const res = await apiClient.get("/advertisers");
      setAds(res.data);
    } catch (err) {
      console.error(err);
      alert("Error loading advertisers");
    }
  };

  const saveAdvertiser = async () => {
    if (!name.trim()) return alert("Name required");

    try {
      if (editId) {
        await apiClient.put(`/advertisers/${editId}`, { name, email, website });
        alert("Updated");
      } else {
        await apiClient.post("/advertisers", { name, email, website });
        alert("Added");
      }

      setName("");
      setEmail("");
      setWebsite("");
      setEditId(null);
      fetchAds();
    } catch (err) {
      console.error(err);
      alert("Error saving advertiser");
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
      alert("Deleted");
      fetchAds();
    } catch (err) {
      console.error(err);
      alert("Error deleting advertiser");
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  return (
    <div className="p-5">
      <h2 className="text-2xl font-bold mb-4">Advertisers</h2>

      <div className="grid grid-cols-4 gap-2 max-w-xl mb-4">
        <input
          className="border p-2 rounded"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="border p-2 rounded"
          placeholder="Email"
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
          onClick={saveAdvertiser}
          className="bg-blue-600 text-white p-2 rounded"
        >
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
          {ads.map((a) => (
            <tr key={a.id} className="border-b">
              <td className="p-2">{a.name}</td>
              <td className="p-2">{a.email}</td>
              <td className="p-2">
                <a
                  href={a.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  {a.website}
                </a>
              </td>
              <td className="p-2 space-x-2">
                <button
                  onClick={() => editAdvertiser(a)}
                  className="bg-yellow-500 text-white px-2 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteAdvertiser(a.id)}
                  className="bg-red-600 text-white px-2 py-1 rounded"
                >
                  Del
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
