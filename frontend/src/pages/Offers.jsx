import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function Offers() {
  const [name, setName] = useState("");
  const [payout, setPayout] = useState("");
  const [url, setUrl] = useState("");
  const [offers, setOffers] = useState([]);

  const loadOffers = async () => {
    const res = await apiClient.get("/offers");
    setOffers(res.data);
  };

  const createOffer = async () => {
    if (!name || !payout || !url) return alert("Fill all fields!");

    const res = await apiClient.post("/offers", { name, payout, url });
    alert("✅ Offer Created");
    setName(""); setPayout(""); setUrl("");
    loadOffers();
  };

  useEffect(() => {
    loadOffers();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Offers</h2>

      {/* Add Offer Form */}
      <div className="grid grid-cols-4 gap-2 mb-4 max-w-3xl">
        <input className="border p-2 rounded" placeholder="Offer Name" value={name} onChange={(e)=>setName(e.target.value)} />
        <input className="border p-2 rounded" placeholder="Payout" value={payout} onChange={(e)=>setPayout(e.target.value)} />
        <input className="border p-2 rounded" placeholder="Offer URL" value={url} onChange={(e)=>setUrl(e.target.value)} />
        <button onClick={createOffer} className="bg-green-600 text-white px-4 py-2 rounded">Add</button>
      </div>

      {/* Offer List */}
      <table className="min-w-full bg-white rounded shadow text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Name</th>
            <th className="p-2">Payout</th>
            <th className="p-2">URL</th>
          </tr>
        </thead>
        <tbody>
          {offers.map(o => (
            <tr key={o.id} className="border-b">
              <td className="p-2">{o.name}</td>
              <td className="p-2">${o.payout}</td>
              <td className="p-2 text-blue-600 break-all">{o.url}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
