// frontend/src/components/charts/ClicksChart.jsx
import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

// small presentational chart component. Accepts data: [{ time: '2025-11-25', clicks: 12 }, ...]
export default function ClicksChart({ data = [], group = "day" }) {
  if (!data || data.length === 0) {
    return <div style={{ padding: 16, textAlign: "center", color: "#6b7280" }}>No chart data</div>;
  }

  // display as line chart for day/hour. Bar is also possible - trying line for clarity
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 6 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" minTickGap={10} />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="clicks" stroke="#4F46E5" strokeWidth={2} dot={{ r: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
