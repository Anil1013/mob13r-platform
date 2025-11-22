// frontend/src/pages/FraudAlerts.jsx
import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function FraudAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [whitelist, setWhitelist] = useState([]);
  const [blocked, setBlocked] = useState([]);

  const [loading, setLoading] = useState(false);
  const [newPub, setNewPub] = useState("");
  const [newPubReason, setNewPubReason] = useState("");
  const [newBlockIp, setNewBlockIp] = useState("");
  const [newBlockReason, setNewBlockReason] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [a, w, b] = await Promise.all([
        apiClient.get("/fraud/alerts"),
        apiClient.get("/fraud/whitelist"),
        apiClient.get("/fraud/blocked"),
      ]);
      setAlerts(a.data || []);
      setWhitelist(w.data || []);
      setBlocked(b.data || []);
    } catch (err) {
      console.error("Fraud Alerts Load ERROR:", err);
      alert("Failed to load fraud data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  /* Whitelist actions */
  const addWhitelist = async () => {
    if (!newPub) return alert("Enter PUB_ID");
    try {
      await apiClient.post("/fraud/whitelist", { pub_id: newPub.toUpperCase(), reason: newPubReason });
      setNewPub("");
      setNewPubReason("");
      fetchAll();
    } catch (err) {
      console.error(err);
      alert("Failed to add whitelist");
    }
  };

  const removeWhitelist = async (pub) => {
    if (!window.confirm(`Remove ${pub} from whitelist?`)) return;
    try {
      await apiClient.delete(`/fraud/whitelist/${pub}`);
      fetchAll();
    } catch (err) {
      console.error(err);
      alert("Failed to remove whitelist");
    }
  };

  /* Blocked IP actions */
  const addBlockedIp = async () => {
    if (!newBlockIp) return alert("Enter IP");
    try {
      await apiClient.post("/fraud/blocked", { ip: newBlockIp, reason: newBlockReason });
      setNewBlockIp("");
      setNewBlockReason("");
      fetchAll();
    } catch (err) {
      console.error(err);
      alert("Failed to block IP");
    }
  };

  const removeBlockedIp = async (ip) => {
    if (!window.confirm(`Unblock ${ip}?`)) return;
    try {
      await apiClient.delete(`/fraud/blocked/${ip}`);
      fetchAll();
    } catch (err) {
      console.error(err);
      alert("Failed to unblock IP");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Fraud Alerts & Whitelist</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-2 bg-white p-4 rounded shadow">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">Recent Alerts</h2>
            <button onClick={fetchAll} className="px-3 py-1 bg-gray-200 rounded">Refresh</button>
          </div>
          {loading ? <div>Loading...</div> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2">Time</th>
                  <th className="p-2">PUB</th>
                  <th className="p-2">IP</th>
                  <th className="p-2">Reason</th>
                  <th className="p-2">UA</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(a => (
                  <tr key={a.id} className="border-t">
                    <td className="p-2">{new Date(a.created_at).toLocaleString()}</td>
                    <td className="p-2">{a.pub_id}</td>
                    <td className="p-2">{a.ip}</td>
                    <td className="p-2">{a.reason}</td>
                    <td className="p-2 truncate max-w-[320px]">{a.user_agent}</td>
                  </tr>
                ))}
                {alerts.length === 0 && <tr><td colSpan={5} className="p-4 text-center">No alerts</td></tr>}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Whitelist PUB_ID</h2>

          <div className="mb-2">
            <input placeholder="PUB_ID" value={newPub} onChange={e => setNewPub(e.target.value)} className="border p-2 rounded w-full mb-2" />
            <input placeholder="Reason (optional)" value={newPubReason} onChange={e => setNewPubReason(e.target.value)} className="border p-2 rounded w-full mb-2" />
            <button onClick={addWhitelist} className="bg-green-600 text-white px-3 py-1 rounded">Add to Whitelist</button>
          </div>

          <h3 className="mt-3 font-medium">Current Whitelist</h3>
          <ul className="mt-2 space-y-2">
            {whitelist.map(w => (
              <li key={w.pub_id} className="flex justify-between items-center border p-2 rounded">
                <div>
                  <div className="font-medium">{w.pub_id}</div>
                  <div className="text-xs text-gray-500">{w.reason}</div>
                </div>
                <div>
                  <button onClick={() => removeWhitelist(w.pub_id)} className="px-2 py-1 bg-red-500 text-white rounded">Remove</button>
                </div>
              </li>
            ))}
            {whitelist.length === 0 && <li className="text-sm text-gray-500">No whitelisted PUB_IDs</li>}
          </ul>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-semibold mb-2">Blocked IPs</h2>

        <div className="mb-3 flex gap-2">
          <input placeholder="IP to block" value={newBlockIp} onChange={e => setNewBlockIp(e.target.value)} className="border p-2 rounded w-1/3" />
          <input placeholder="Reason (optional)" value={newBlockReason} onChange={e => setNewBlockReason(e.target.value)} className="border p-2 rounded w-1/3" />
          <button onClick={addBlockedIp} className="bg-red-600 text-white px-3 py-1 rounded">Block IP</button>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">IP</th>
              <th className="p-2">Reason</th>
              <th className="p-2">Added</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {blocked.map(b => (
              <tr key={b.ip} className="border-t">
                <td className="p-2">{b.ip}</td>
                <td className="p-2">{b.reason}</td>
                <td className="p-2">{new Date(b.added_at).toLocaleString()}</td>
                <td className="p-2">
                  <button onClick={() => removeBlockedIp(b.ip)} className="px-2 py-1 bg-yellow-500 text-white rounded">Unblock</button>
                </td>
              </tr>
            ))}
            {blocked.length === 0 && <tr><td colSpan={4} className="p-4 text-center">No blocked IPs</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
