import React, { useState, useEffect } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("reports");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_URL = process.env.REACT_APP_API_URL;

  // ✅ Auto-refresh every 10 minutes
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

  // ✅ Export as CSV
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

  // ✅ Export as PDF
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

  // ✅ Tab Titles
  const tabs = [
    { key: "reports", label: "Reports" },
    { key: "partners", label: "Partners" },
    { key: "affiliates", label: "Affiliates" },
    { key: "offers", label: "Offers" },
  ];

  return (
    <div className="min-h-screen bg-[#0b1221] text-gray-100 p-6">
      <h1 className="text-3xl font-bold text-cyan-400 mb-6 text-center">
        ⚙️ Mob13r Admin Dashboard
      </h1>

      {/* 🔹 Tabs Navigation */}
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
