// File: frontend/src/pages/Dashboard.jsx

import React, { useEffect, useState } from "react";
import axios from "../api/apiClient";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch stats from backend
  useEffect(() => {
    async function loadStats() {
      try {
        const res = await axios.get("/admin/stats");
        setStats(res.data || {});
      } catch (err) {
        console.error("Error loading stats", err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Dashboard Overview</h2>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <Card>
          <CardHeader>
            <CardTitle>Total Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.totalClicks ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.totalConversions ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Global CR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(stats.conversionRate ?? 0).toFixed(2)}%
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Traffic Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Traffic Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-gray-700 dark:text-gray-300">
            <p>Offers Active: {stats.offersActive ?? 0}</p>
            <p>Publishers Online: {stats.publishersOnline ?? 0}</p>
            <p>Fraud Alerts Today: {stats.fraudAlerts ?? 0}</p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

export default Dashboard;
