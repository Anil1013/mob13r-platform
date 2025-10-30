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
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // auto refresh
    return () => clearInterval(interval);
  }, []);

  if (loading)
    return <div className="text-center mt-20 text-lg">Loading stats...</div>;

  // Tailwind color map fix
  const colorMap = {
    indigo: {
      border: "border-indigo-500",
      text: "text-indigo-600",
      dark: "dark:text-indigo-400",
    },
    green: {
      border: "border-green-500",
      text: "text-green-600",
      dark: "dark:text-green-400",
    },
    yellow: {
      border: "border-yellow-500",
      text: "text-yellow-600",
      dark: "dark:text-yellow-400",
    },
    purple: {
      border: "border-purple-500",
      text: "text-purple-600",
      dark: "dark:text-purple-400",
    },
  };

  const cards = [
    { title: "Publishers", value: stats.publishers, color: "indigo" },
    { title: "Advertisers", value: stats.advertisers, color: "green" },
    { title: "Offers", value: stats.offers, color: "yellow" },
    { title: "Conversions", value: stats.conversions, color: "purple" },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-white">
          Live Stats
        </h2>

        <button
          onClick={fetchStats}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          <RefreshCcw size={18} /> Refresh Now
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {cards.map((card) => {
          const styles = colorMap[card.color];
          return (
            <div
              key={card.title}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center border-t-4 ${styles.border}`}
            >
              <h3 className="text-gray-600 dark:text-gray-300 text-lg">
                {card.title}
              </h3>
              <p className={`text-3xl font-bold mt-2 ${styles.text} ${styles.dark}`}>
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-sm text-gray-500 dark:text-gray-300">
        Last updated: {lastRefresh}
      </p>
    </div>
  );
}
