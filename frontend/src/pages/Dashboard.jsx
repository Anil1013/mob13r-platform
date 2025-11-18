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

  const fetchStats = async () => {
    try {
      const response = await fetch("https://backend.mob13r.com/api/stats");

      if (!response.ok) {
        console.warn("⚠️ Stats API responded with non-200:", response.status);
        setLoading(false);
        return; // keep default stats
      }

      const data = await response.json();

      setStats({
        totalClicks: data?.totalClicks ?? 0,
        totalConversions: data?.totalConversions ?? 0,
        revenue: data?.revenue ?? 0,
        globalCR: data?.globalCR ?? 0,
      });
    } catch (err) {
      console.error("❌ Error fetching stats:", err);
      // Keep default stats
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-8">

      {/* PAGE TITLE */}
      <h2 className="text-3xl font-semibold tracking-tight">
        Dashboard Overview
      </h2>

      {/* LOADING STATE */}
      {loading && (
        <div className="tex
