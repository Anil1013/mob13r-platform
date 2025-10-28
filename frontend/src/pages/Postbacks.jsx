import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function Postbacks() {
  const [data, setData] = useState([]);

  useEffect(() => {
    apiClient.get("/postbacks").then(res => setData(res.data || []));
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Postbacks</h2>
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
          <th className="p-2 border">Conversion</th>
          <th className="p-2 border">URL</th>
          <th className="p-2 border">Status</th>
        </tr>
      </thead>
      <tbody>
        {data.map((p) => (
          <tr key={p.id} className="text-sm">
            <td className="p-2 border">{p.id}</td>
            <td className="p-2 border">{p.conversion_id}</td>
            <td className="p-2 border">{p.url}</td>
            <td className="p-2 border">{p.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
