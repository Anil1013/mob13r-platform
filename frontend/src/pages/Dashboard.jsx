import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalClicks: 0,
    totalConversions: 0,
    revenue: 0,
    globalCR: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("https://backend.mob13r.com/api/stats");

        if (!res.ok) {
          console.warn("⚠️ Stats API error:", res.status);
          setLoading(false);
          return;
        }

        const data = await res.json();

        setStats({
          totalClicks: data?.totalClicks ?? 0,
          totalConversions: data?.totalConversions ?? 0,
          revenue: data?.revenue ?? 0,
          globalCR: data?.globalCR ?? 0,
        });
      } catch (err) {
        console.error("❌ Stats fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold tracking-tight">Dashboard Overview</h2>

      {loading && <p className="text-gray-400">Loading stats…</p>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

        <Card>
          <CardHeader>
            <CardTitle>Total Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalClicks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalConversions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{stats.revenue}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Global CR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.globalCR}%</div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
