import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function Dashboard() {
  const [stats, setStats] = useState({ publishers: 0, advertisers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pubRes, advRes] = await Promise.all([
          apiClient.get("/publishers"),
          apiClient.get("/advertisers"),
        ]);
        setStats({
          publishers: pubRes.data.length,
          advertisers: advRes.data.length,
        });
      } catch (err) {
        console.error(err);
        setError("❌ Failed to load data from backend.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Mob13r Dashboard</h1>

      {loading ? (
        <p className="text-gray-500">Loading stats...</p>
      ) : error ? (
        <div className="bg-red-100 text-red-600 px-4 py-3 rounded">{error}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white shadow rounded-xl p-5">
            <h2 className="text-lg font-semibold text-gray-700">Publishers</h2>
            <p className="text-3xl font-bold text-indigo-600 mt-2">
              {stats.publishers}
            </p>
          </div>

          <div className="bg-white shadow rounded-xl p-5">
            <h2 className="text-lg font-semibold text-gray-700">Advertisers</h2>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {stats.advertisers}
            </p>
          </div>

          <div className="bg-white shadow rounded-xl p-5">
            <h2 className="text-lg font-semibold text-gray-700">Active Offers</h2>
            <p className="text-3xl font-bold text-yellow-500 mt-2">24</p>
          </div>

          <div className="bg-white shadow rounded-xl p-5">
            <h2 className="text-lg font-semibold text-gray-700">Conversions</h2>
            <p className="text-3xl font-bold text-purple-600 mt-2">153</p>
          </div>
        </div>
      )}
    </div>
  );
}
