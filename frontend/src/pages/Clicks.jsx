// frontend/src/pages/Clicks.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Clicks() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({
    pub_id: "",
    offer_id: "",
    geo: "",
    carrier: "",
    q: "",
    from: "",
    to: "",
    limit: 200,
    offset: 0,
  });

  const fetchData = async () => {
    try {
      const url = `${import.meta.env.VITE_API_URL}/analytics/clicks`;
      const res = await axios.get(url, {
        params: filters,
        withCredentials: true,
      });

      setRows(res.data.rows || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("fetch clicks error", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters.offset]);

  const applyFilter = () => {
    setFilters({ ...filters, offset: 0 });
    fetchData();
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Clicks Analytics</h2>

      {/* FILTERS */}
      <div className="grid grid-cols-6 gap-3 mb-4">
        <input
          className="border p-2"
          placeholder="PUB (PUB03)"
          value={filters.pub_id}
          onChange={(e) => setFilters({ ...filters, pub_id: e.target.value })}
        />

        <input
          className="border p-2"
          placeholder="OFFER (OFF02)"
          value={filters.offer_id}
          onChange={(e) =>
            setFilters({ ...filters, offer_id: e.target.value })
          }
        />

        <input
          className="border p-2"
          placeholder="GEO (IN)"
          value={filters.geo}
          onChange={(e) => setFilters({ ...filters, geo: e.target.value })}
        />

        <input
          className="border p-2"
          placeholder="Carrier"
          value={filters.carrier}
          onChange={(e) =>
            setFilters({ ...filters, carrier: e.target.value })
          }
        />

        <input
          type="date"
          className="border p-2"
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
        />

        <input
          type="date"
          className="border p-2"
          value={filters.to}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
        />
      </div>

      <button
        onClick={applyFilter}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Apply
      </button>

      {/* TABLE */}
      <div className="mt-6 bg-white shadow rounded">
        <table className="w-full text-center border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Time</th>
              <th className="p-2 border">PUB</th>
              <th className="p-2 border">Publisher</th>
              <th className="p-2 border">Offer</th>
              <th className="p-2 border">Offer Name</th>
              <th className="p-2 border">Advertiser</th>
              <th className="p-2 border">IP</th>
              <th className="p-2 border">Click ID</th>
              <th className="p-2 border">GEO</th>
              <th className="p-2 border">Carrier</th>
              <th className="p-2 border">UA</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border p-2">{r.created_at}</td>
                <td className="border p-2">{r.pub_code}</td>
                <td className="border p-2">{r.publisher_name}</td>
                <td className="border p-2">{r.offer_code}</td>
                <td className="border p-2">{r.offer_name}</td>
                <td className="border p-2">{r.advertiser_name}</td>
                <td className="border p-2">{r.ip_address}</td>
                <td className="border p-2">{r.click_id}</td>
                <td className="border p-2">{r.geo}</td>
                <td className="border p-2">{r.carrier}</td>
                <td className="border p-2">{r.user_agent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex gap-2">
        <button
          disabled={filters.offset <= 0}
          onClick={() =>
            setFilters({ ...filters, offset: filters.offset - filters.limit })
          }
          className="px-3 py-1 border rounded"
        >
          Prev
        </button>

        <button
          onClick={() =>
            setFilters({ ...filters, offset: filters.offset + filters.limit })
          }
          className="px-3 py-1 border rounded"
        >
          Next
        </button>
      </div>
    </div>
  );
}
