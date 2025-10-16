import React, { useState, useEffect } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";

// ✅ Small utility for animated counter
const useCountUp = (value, duration = 1000) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseFloat(value) || 0;
    if (start === end) return;
    const increment = (end - start) / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        start = end;
        clearInterval(timer);
      }
      setDisplay(Number(start.toFixed(value % 1 === 0 ? 0 : 2)));
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return display;
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("reports");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    fetchData(activeTab);
    const interval = setInterval(() => fetchData(activeTab), 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // ✅ Fetch data from backend
  const fetchData = async (type) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/admin/${type}`);
      setData(res.data);
    } catch (err) {
      console.error("Error fetching data:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Export CSV
  const exportCSV = () => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(","),
      ...data.map((row) => headers.map((h) => row[h]).join(",")),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `${activeTab}.csv`);
  };

  // ✅ Export PDF
  const exportPDF = () => {
    if (!data.length) return;
    const doc = new jsPDF();
    doc.text(`${activeTab.toUpperCase()} Data`, 14, 16);
    autoTable(doc, {
      startY: 20,
      head: [Object.keys(data[0])],
      body: data.map((row) => Object.values(row)),
      styles: { halign: "center" },
    });
    doc.save(`${activeTab}.pdf`);
  };

  // ✅ Calculate totals (Reports only)
  const totals = activeTab === "reports" && data.length
    ? {
        clicks: data.reduce((sum, r) => sum + (r.clicks || 0), 0),
        conversions: data.reduce((sum, r) => sum + (r.conversions || 0), 0),
        revenue: data.reduce((sum, r) => sum + (r.revenue || 0), 0),
        profit: data.reduce((sum, r) => sum + (r.profit || 0), 0),
      }
    : null;

  // ✅ Calculate previous day comparison (trends)
  const getTrend = (field) => {
    if (data.length < 2) return 0;
    const today = data[0][field] || 0;
    const yesterday = data[1][field] || 0;
    if (yesterday === 0) return 0;
    return (((today - yesterday) / yesterday) * 100).toFixed(1);
  };

  const trends = {
    clicks: getTrend("clicks"),
    conversions: getTrend("conversions"),
    revenue: getTrend("revenue"),
    profit: getTrend("profit"),
  };

  // ✅ Animated values
  const animatedClicks = useCountUp(totals?.clicks || 0);
  const animatedConversions = useCountUp(totals?.conversions || 0);
  const animatedRevenue = useCountUp(totals?.revenue || 0);
  const animatedProfit = useCountUp(totals?.profit || 0);

  const tabs = [
    { key: "reports", label: "Reports" },
    { key: "partners", label: "Partners" },
    { key: "affiliates", label: "Affiliates" },
    { key: "offers", label: "Offers" },
  ];

  const renderTrend = (value) => {
    if (value === 0) return <span className="text-gray-400 text-sm">—</span>;
    const color = value > 0 ? "text-green-400" : "text-red-400";
    const symbol = value > 0 ? "▲" : "▼";
    return (
      <span className={`${color} text-sm font-medium`}>
        {symbol} {Math.abs(value)}%
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0b1221] text-gray-100 p-6">
      <h1 className="text-3xl font-bold text-cyan-400 mb-6 text-center">
        ⚙️ Mob13r Admin Dashboard
      </h1>

      {/* 🔹 Tabs */}
      <div className="flex justify-center gap-4 mb-8 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-xl font-semibold transition-all duration-200 ${
              activeTab === tab.key
                ? "bg-cyan-600 text-white"
                : "bg-[#1a2337] hover:bg-[#202c46] text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 🌟 Summary Cards (Reports only) */}
      {activeTab === "reports" && totals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-center">
          {[
            { label: "Total Clicks", value: animatedClicks, trend: trends.clicks, color: "text-cyan-400" },
            { label: "Conversions", value: animatedConversions, trend: trends.conversions, color: "text-cyan-400" },
            { label: "Revenue ($)", value: animatedRevenue, trend: trends.revenue, color: "text-green-400" },
            { label: "Profit ($)", value: animatedProfit, trend: trends.profit, color: "text-yellow-400" },
          ].map((card, idx) => (
            <div
              key={idx}
              className="bg-[#121a2b] p-5 rounded-xl shadow-lg hover:shadow-cyan-700 transition-all"
            >
              <h3 className="text-lg text-gray-300">{card.label}</h3>
              <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
              <div className="mt-1">{renderTrend(card.trend)}</div>
            </div>
          ))}
        </div>
      )}

      {/* 🔹 Export Buttons */}
      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={exportCSV}
          className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg font-semibold"
        >
          Export CSV
        </button>
        <button
          onClick={exportPDF}
          className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-semibold"
        >
          Export PDF
        </button>
      </div>

      {/* 🔹 Data Table */}
      <div className="bg-[#121a2b] p-6 rounded-2xl shadow-xl overflow-x-auto">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4 text-center">
          {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Data
        </h2>

        {loading ? (
          <p className="text-center text-gray-400">Loading...</p>
        ) : data.length > 0 ? (
          <table className="w-full border-collapse text-center">
            <thead>
              <tr className="border-b border-gray-700 text-cyan-300">
                {Object.keys(data[0]).map((header) => (
                  <th key={header} className="p-3 capitalize">
                    {header.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-800 hover:bg-[#1a2337] transition-all duration-150"
                >
                  {Object.values(row).map((val, j) => (
                    <td key={j} className="p-3 text-center">
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center text-gray-400">No data available.</p>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
