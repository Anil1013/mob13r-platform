// File: frontend/src/pages/Dashboard.jsx

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalClicks: 0,
    totalConversions: 0,
    totalRevenue: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const token = localStorage.getItem("mob13r_token");

        if (!token) {
          console.warn("⚠️ No token found!");
          setLoading(false);
          return;
        }

        const res = await fetch("https://backend.mob13r.com/api/admin/stats", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        if (!res.ok) {
          console.warn("⚠️ Stats API error:", res.status);
          setLoading(false);
          return;
        }

        const data = await res.json();

        setStats({
          totalClicks: data.totalClicks || 0,
          totalConversions: data.totalConversions || 0,
          totalRevenue: data.totalRevenue || 0,
        });
      } catch (err) {
        console.error("⚠️ Stats API failed:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* Total Clicks */}
      <Card>
        <CardHeader>
          <CardTitle>Total Clicks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-600">
            {loading ? "..." : stats.totalClicks.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      {/* Total Conversions */}
      <Card>
        <CardHeader>
          <CardTitle>Total Conversions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            {loading ? "..." : stats.totalConversions.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      {/* Total Revenue */}
      <Card>
        <CardHeader>
          <CardTitle>Total Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-purple-600">
            ₹{loading ? "..." : stats.totalRevenue.toLocaleString()}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
