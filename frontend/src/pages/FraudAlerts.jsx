import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function FraudAlerts() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get("/fraud-alerts");
        setAlerts(res.data);
      } catch (err) {
        alert("⚠️ Failed to load fraud alerts");
      }
    };
    fetchData();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Fraud Alerts</h2>
      <table className="min-w-full bg-white rounded shadow text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Publisher</th>
            <th className="p-2">Advertiser</th>
            <th className="p-2">IP Address</th>
            <th className="p-2">Reason</th>
            <th className="p-2">Risk Score</th>
            <th className="p-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((a) => (
            <tr key={a.id} className="border-b">
              <td className="p-2">{a.publisher_name}</td>
              <td className="p-2">{a.advertiser_name}</td>
              <td className="p-2">{a.ip_address}</td>
              <td className="p-2">{a.reason}</td>
              <td className="p-2">{a.risk_score}</td>
              <td className="p-2">{new Date(a.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
