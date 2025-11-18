import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = "https://backend.mob13r.com/api/stats";
  const token = localStorage.getItem("mob13r_token");

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch(API_URL, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error("Stats fetch failed: " + res.status);

        const data = await res.json();

        setStats({
          clicks: data.totalClicks || 0,
          conversions: data.totalConversions || 0,
          revenue: data.totalRevenue || 0,
        });
      } catch (err) {
        console.warn("⚠ Stats API error:", err.message);

        // graceful fallback
        setStats({ clicks: 0, conversions: 0, revenue: 0 });
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  if (loading) return <div className="text-white p-6">Loading stats...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="bg-white/20 backdrop-blur-lg text-white">
        <CardHeader>
          <CardTitle>Total Clicks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{stats.clicks.toLocaleString()}</p>
        </CardContent>
      </Card>

      <Card className="bg-white/20 backdrop-blur-lg text-white">
        <CardHeader>
          <CardTitle>Total Conversions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">
            {stats.conversions.toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white/20 backdrop-blur-lg text-white">
        <CardHeader>
          <CardTitle>Total Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">
            ₹{stats.revenue.toLocaleString()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
