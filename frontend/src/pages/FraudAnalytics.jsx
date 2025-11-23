import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import apiClient from "../api/apiClient";

// Chart colors
const COLORS = ["#4F46E5", "#EF4444", "#F59E0B", "#10B981", "#06B6D4", "#8B5CF6"];

export default function FraudAnalytics() {
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [liveFeed, setLiveFeed] = useState([]);
  const [pubFilter, setPubFilter] = useState("");
  const [geoFilter, setGeoFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [limit, setLimit] = useState(500);

  // -------------------------------
  // FETCH ALERTS
  // -------------------------------
  const fetchAlerts = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (pubFilter) params.append("pub_id", pubFilter);
      if (geoFilter) params.append("geo", geoFilter);
      if (severityFilter) params.append("severity", severityFilter);
      if (dateFrom) params.append("from", dateFrom);
      if (dateTo) params.append("to", dateTo);
      params.append("limit", limit.toString());

      const res = await apiClient.get(`/fraud/alerts?${params.toString()}`);
      setAlerts(res.data || []);
      setLiveFeed((res.data || []).slice(0, 25));
    } catch (err) {
      console.error("fetchAlerts error", err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const iv = setInterval(fetchAlerts, 20000);
    return () => clearInterval(iv);
  }, []);

  // -------------------------------
  // METRICS
  // -------------------------------
  const metrics = useMemo(() => {
    const total = alerts.length;
    const high = alerts.filter((a) => (a.severity || "").toLowerCase() === "high").length;
    const uniqueIps = new Set(alerts.map((a) => a.ip)).size;

    const byPub = {};
    alerts.forEach((a) => {
      byPub[a.pub_id] = (byPub[a.pub_id] || 0) + 1;
    });

    const toppub = Object.entries(byPub).sort((a, b) => b[1] - a[1])[0] || ["—", 0];

    return {
      total,
      high,
      uniqueIps,
      topPub: toppub[0],
      topPubCount: toppub[1],
    };
  }, [alerts]);

  // -------------------------------
  // TIME SERIES DATA
  // -------------------------------
  const timeseries = useMemo(() => {
    const map = {};
    alerts.forEach((a) => {
      const d = new Date(a.created_at);
      const key = d.toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + 1;
    });

    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, alerts]) => ({ date, alerts }));
  }, [alerts]);

  // -------------------------------
  // REASON PIE CHART
  // -------------------------------
  const reasonData = useMemo(() => {
    const map = {};
    alerts.forEach((a) => {
      const r = a.reason || "unknown";
      map[r] = (map[r] || 0) + 1;
    });

    return Object.entries(map)
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [alerts]);

  // -------------------------------
  // TABLE ACTIONS
  // -------------------------------
  const resolveAlert = async (id) => {
    try {
      await apiClient.post(`/fraud/alerts/${id}/resolve`, {
        resolved_by: localStorage.getItem("mob13r_admin") || "admin",
      });
      fetchAlerts();
    } catch (err) {
      alert("Failed to resolve alert");
    }
  };

  const whitelistPub = async (pub) => {
    if (!pub) return alert("No PUB ID");
    await apiClien
