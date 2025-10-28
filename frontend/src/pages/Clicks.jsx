import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function Clicks() {
  const [data, setData] = useState([]);

  useEffect(() => {
    apiClient.get("/clicks").then(res => setData(res.data || []));
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Clicks</h2>
      <Table data={data} />
    </div>
  );
}

const Table = ({ data }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full bg-white border">
      <thead>
        <tr className="bg-gray-100 text-left text-sm">
          <th className="p-2 border">ID</th>
          <th className="p-2 border">Offer</th>
          <th className="p-2 border">Publisher</th>
          <th className="p-2 border">Time</th>
        </tr>
      </thead>
      <tbody>
        {data.map((c) => (
          <tr key={c.id} className="text-sm">
            <td className="p-2 border">{c.id}</td>
            <td className="p-2 border">{c.offer_id}</td>
            <td className="p-2 border">{c.publisher_id}</td>
            <td className="p-2 border">{c.click_time}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
