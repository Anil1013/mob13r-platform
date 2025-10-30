import React, { useState, useEffect } from "react";
import QueryConsole from "../components/QueryConsole";
import apiClient from "../api/apiClient";

export default function Dashboard() {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await apiClient.get("/stats");
      setStats(res.data);
    } catch (e) {
      console.error("❌ Error loading stats:", e.message);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const safe = (key) => stats?.[key] ?? 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">
          Overview
        </h2>
        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          onClick={() => setOpen(true)}
        >
          Open Query Console
        </button>
      </div>

      {/* Stats Section */}
      {loading ? (
        <div className="grid md:grid-cols-4 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid md:grid-cols-4 gap-6">
          <StatCard title="Publishers" value={safe("publishers")} color="indigo" />
          <StatCard title="Advertisers" value={safe("advertisers")} color="green" />
          <StatCard title="Offers" value={safe("offers")} color="yellow" />
          <StatCard title="Conversions" value={safe("conversions")} color="purple" />
        </div>
      )}

      <QueryConsole open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

const SkeletonCard = () => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
    <div className="h-8 bg-gray-300 rounded w-1/3"></div>
  </div>
);

const StatCard = ({ title, value, color }) => (
  <div
    className={`bg-white rounded-lg shadow p-6 text-center border-t-4 border-${color}-500`}
  >
    <h3 className="text-gray-600 text-lg">{title}</h3>
    <p className={`text-${color}-600 text-3xl font-bold mt-2`}>{value}</p>
  </div>
);
