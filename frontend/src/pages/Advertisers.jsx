import React, { useState, useEffect } from "react";
import apiClient from "../api/apiClient";

export default function Advertisers() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [ads, setAds] = useState([]);

  const fetchAds = async () => {
    const res = await apiClient.get("/advertisers");
    setAds(res.data);
  };

  const createAd = async () => {
    if (!name) return alert("Enter name");
    const res = await apiClient.post("/advertisers", { name, email, website });
    alert("✅ Advertiser Created");
    setName(""); setEmail(""); setWebsite("");
    fetchAds();
  };

  useEffect(() => { fetchAds(); }, []);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Advertisers</h2>

      <div className="mb-4 grid grid-cols-4 gap-2 max-w-xl">
        <input className="border p-2 rounded" placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} />
        <input className="border p-2 rounded" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="border p-2 rounded" placeholder="Website" value={website} onChange={(e)=>setWebsite(e.target.value)} />
        <button onClick={createAd} className="bg-blue-600 text-white px-4 py-2 rounded">Add</button>
      </div>

      <table className="min-w-full bg-white rounded shadow text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Name</th>
            <th className="p-2">Email</th>
            <th className="p-2">Website</th>
          </tr>
        </thead>
        <tbody>
          {ads.map(a => (
            <tr key={a.id} className="border-b">
              <td className="p-2">{a.name}</td>
              <td className="p-2">{a.email}</td>
              <td className="p-2 text-blue-600">{a.website}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
