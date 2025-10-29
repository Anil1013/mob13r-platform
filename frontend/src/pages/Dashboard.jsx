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
      console.error("Error loading stats:", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
          Overview
        </h2>
        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          onClick={() => setOpen(true)}
        >
          Open Query Console
        </button>
      </div>

      {/* Cards Section */}
      {loading ? (
        <p className="text-gray-600 dark:text-gray-300">Loading stats...</p>
      ) : (
        <div className="grid md:grid-cols-4 gap-6">
          <StatCard title="Publishers" value={stats.publishers} color="indigo" />
          <StatCard title="Advertisers" value={stats.advertisers} color="green" />
          <StatCard title="Offers" value={stats.offers} color="yellow" />
          <StatCard title="Conversions" value={stats.conversions} color="purple" />
        </div>
      )}

      {/* Query Console */}
      <QueryConsole open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

const StatCard = ({ title, value, color }) => (
  <div
    className={`bg-white dark:bg-gray-900 rounded-lg shadow p-6 text-center border-t-4 border-${color}-500`}
  >
    <h3 className="text-gray-600 dark:text-gray-300 text-lg">{title}</h3>
    <p className={`text-${color}-600 dark:text-${color}-400 text-3xl font-bold mt-2`}>
      {value}
    </p>
  </div>
);
