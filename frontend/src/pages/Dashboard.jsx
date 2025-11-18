// File: frontend/src/pages/Dashboard.jsx
// Fully fixed + modernized + CRA compatible

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import {
  MousePointerClick,
  Zap,
  DollarSign,
  Users,
} from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState({
    clicks: 12450,
    conversions: 742,
    revenue: 3567,
    publishers: 89,
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          Mob13r Dashboard
        </h2>
        <p className="text-gray-500 text-sm">Welcome, admin@mob13r.com</p>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Clicks */}
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-yellow-100 text-yellow-700">
              <MousePointerClick size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Clicks</p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.clicks.toLocaleString()}
              </h3>
            </div>
          </CardContent>
        </Card>

        {/* Conversions */}
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-pink-100 text-pink-600">
              <Zap size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Conversions</p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.conversions.toLocaleString()}
              </h3>
            </div>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-100 text-green-600">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Revenue (USD)</p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                ${stats.revenue.toLocaleString()}
              </h3>
            </div>
          </CardContent>
        </Card>

        {/* Publishers */}
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Publishers</p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.publishers}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-2xl h-72 flex flex-col">
          <CardContent className="p-6 flex-1">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Clicks vs Conversions Trend
            </h3>
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
              📊 Chart Component Goes Here
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl h-72 flex flex-col">
          <CardContent className="p-6 flex-1">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Daily Revenue Distribution
            </h3>
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
              💰 Revenue Chart Component Goes Here
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
