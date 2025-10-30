import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";
import { RefreshCcw } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchStats = async () => {
    try {
      const res = await apiClient.get("/stats");
      setStats(res.data);
      setLastRefresh(new Date().toLocaleTimeString());
      setLoading(false);
    } catch (err) {
      console.error("❌ Stats Error:", err);
    }
  };

  useEffect(() => {
    fetchStats(); // first load

    // auto-refresh every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-center mt-20 text-lg">Loading stats...</div>;

  const cards = [
    { title: "Publishers", value: stats.publishers, color: "indigo" },
    { title: "Advertisers", value: stats.advertisers, color: "green" },
    { title: "Offers", value: stats.offers, color: "yellow" },
    { title: "Conversions", value: stats.conversions, color: "purple" },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-white">Live Stats</h2>

        <button
          onClick={fetchStats}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          <RefreshCcw size={18} /> Refresh Now
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div
            key={card.title}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center border-t-4 border-${card.color}-500`}
          >
            <h3 className="text-gray-600 dark:text-gray-300 text-lg">{card.title}</h3>
            <p className={`text-${card.color}-600 dark:text-${card.color}-400 text-3xl font-bold mt-2`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-gray-500 dark:text-gray-300">
        Last updated: {lastRefresh}
      </p>
    </div>
  );
}
