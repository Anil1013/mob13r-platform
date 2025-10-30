import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function FraudAlerts() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const load = async () => {
      const res = await apiClient.get("/admin/fraud-alerts");
      setAlerts(res.data);
    };
    load();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">⚠️ Fraud Detection Alerts</h2>

      <table className="min-w-full bg-white dark:bg-gray-800 rounded shadow">
        <thead className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white">
          <tr>
            <th className="p-2">Publisher</th>
            <th className="p-2">Issue</th>
            <th className="p-2">Value</th>
            <th className="p-2">Time</th>
          </tr>
        </thead>
        <tbody>
          {alerts.length === 0 && (
            <tr><td colSpan="4" className="text-center p-4">✅ No Issues Found</td></tr>
          )}
          
          {alerts.map((a,i)=>(
            <tr key={i} className="border-t border-gray-200 dark:border-gray-700">
              <td className="p-2">{a.publisher}</td>
              <td className="p-2 text-red-500 font-semibold">{a.issue}</td>
              <td className="p-2">{a.value}</td>
              <td className="p-2 text-sm">{a.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
