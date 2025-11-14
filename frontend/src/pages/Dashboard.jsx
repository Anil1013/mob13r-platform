import React, { useEffect, useState } from "react";
import { TrendingUp, Users, MousePointerClick, BarChart2, Zap } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState({
    clicks: 12450,
    conversions: 742,
    revenue: 3567,
    publishers: 89,
  });

  useEffect(() => {
    // Later you can fetch live stats from backend
  }, []);

  const kpiCards = [
    {
      title: "Total Clicks",
      value: stats.clicks,
      icon: <MousePointerClick size={28} />,
      color: "from-orange-400 to-yellow-500",
    },
    {
      title: "Conversions",
      value: stats.conversions,
      icon: <Zap size={28} />,
      color: "from-pink-500 to-red-500",
    },
    {
      title: "Revenue (USD)",
      value: `$${stats.revenue}`,
      icon: <TrendingUp size={28} />,
      color: "from-green-400 to-emerald-500",
    },
    {
      title: "Active Publishers",
      value: stats.publishers,
      icon: <Users size={28} />,
      color: "from-blue-400 to-cyan-500",
    },
  ];

  return (
    <div className="space-y-8">

      {/* -------------------------- KPI CARDS -------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {kpiCards.map((card, i) => (
          <div
            key={i}
            className="p-6 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 
              shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-xl hover:scale-[1.02] 
              transition-all cursor-pointer"
          >
            <div
              className={`w-14 h-14 rounded-xl bg-gradient-to-br ${card.color} 
                flex items-center justify-center text-white shadow-lg mb-4`}
            >
              {card.icon}
            </div>

            <h2 className="text-gray-300 text-sm font-medium tracking-wide">{card.title}</h2>

            <p className="text-3xl font-semibold text-white mt-1 drop-shadow-lg">
              {card.value}
            </p>

            <p className="text-xs text-gray-400 mt-2">
              Updated just now
            </p>
          </div>
        ))}
      </div>


      {/* -------------------------- CHART AREA -------------------------- */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* PERFORMANCE CHART */}
        <div className="bg-white/10 rounded-xl p-6 border border-white/20 backdrop-blur-xl shadow-lg">
          <h3 className="text-xl font-semibold text-white mb-2">
            Traffic Performance
          </h3>
          <p className="text-gray-400 text-sm mb-6">Clicks vs Conversions trend</p>

          {/* Chart Placeholder */}
          <div className="w-full h-64 bg-black/20 border border-white/10 rounded-lg 
            flex items-center justify-center text-gray-500 text-sm">
            📊 Chart Component Goes Here
          </div>
        </div>

        {/* REVENUE CHART */}
        <div className="bg-white/10 rounded-xl p-6 border border-white/20 backdrop-blur-xl shadow-lg">
          <h3 className="text-xl font-semibold text-white mb-2">
            Revenue Analytics
          </h3>
          <p className="text-gray-400 text-sm mb-6">Daily revenue distribution</p>

          <div className="w-full h-64 bg-black/20 border border-white/10 rounded-lg 
            flex items-center justify-center text-gray-500 text-sm">
            💰 Revenue Chart Component Goes Here
          </div>
        </div>
      </div>


      {/* -------------------------- RECENT ACTIVITY -------------------------- */}
      <div className="bg-white/10 rounded-xl p-6 border border-white/20 backdrop-blur-xl shadow-lg">

        <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>

        <div className="space-y-3">

          {[
            "Publisher #122 just generated a new conversion",
            "Offer #221 CTR increased by 12%",
            "New advertiser registered on the platform",
            "Traffic anomaly detected from Region X",
          ].map((item, i) => (
            <div
              key={i}
              className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition"
            >
              <p className="text-gray-300">{item}</p>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}
