import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function Conversions() {
  const [data, setData] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await apiClient.get("/conversions", {
        params: { status: filter }
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [filter]);

  if (loading) return "Loading conversions...";

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-2xl font-semibold">Conversions</h2>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="all">All</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div className="bg-white shadow rounded-lg p-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Click ID</th>
              <th className="p-2">Offer</th>
              <th className="p-2">Payout</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="p-2">{c.click_id}</td>
                <td className="p-2">{c.offer_name}</td>
                <td className="p-2">${c.payout}</td>
                <td className="p-2 uppercase font-semibold">{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
