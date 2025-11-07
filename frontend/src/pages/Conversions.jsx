import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function Conversions() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get("/conversions");
        setData(res.data);
      } catch (err) {
        alert("⚠️ Failed to load conversions");
      }
    };
    fetchData();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Conversions Log</h2>
      <table className="min-w-full bg-white rounded shadow text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Publisher</th>
            <th className="p-2">Advertiser</th>
            <th className="p-2">Click ID</th>
            <th className="p-2">Payout ($)</th>
            <th className="p-2">Status</th>
            <th className="p-2">Time</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c) => (
            <tr key={c.id} className="border-b">
              <td className="p-2">{c.publisher_name}</td>
              <td className="p-2">{c.advertiser_name}</td>
              <td className="p-2">{c.click_id}</td>
              <td className="p-2">{c.payout}</td>
              <td className="p-2">{c.status}</td>
              <td className="p-2">{new Date(c.conversion_time).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
