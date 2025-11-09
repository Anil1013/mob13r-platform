import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function Tracking() {
  const [publishers, setPublishers] = useState([]);
  const [trackingLinks, setTrackingLinks] = useState([]);
  const [search, setSearch] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [form, setForm] = useState({
    publisher_id: "",
    name: "",
    geo: "",
    carrier: "",
    type: "CPA",
    payout: "",
    cap_daily: "",
    cap_total: "",
    hold_percent: "",
    landing_page_url: "",
  });

  const fetchData = async () => {
    try {
      const [pubRes, trackRes] = await Promise.all([
        apiClient.get("/publishers"),
        apiClient.get("/tracking"),
      ]);
      setPublishers(pubRes.data || []);
      setTrackingLinks(trackRes.data || []);
    } catch (err) {
      console.error(err);
      alert("⚠️ Failed to load tracking or publishers");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveTracking = async () => {
    try {
      const payload = { ...form };

      if (!payload.publisher_id || !payload.geo || !payload.carrier) {
        alert("⚠️ Please select publisher, geo, and carrier");
        return;
      }

      if (isEditing) {
        await apiClient.put(`/tracking/${form.id}`, payload);
        alert("✅ Tracking URL updated successfully");
      } else {
        await apiClient.post("/tracking", payload);
        alert("✅ Tracking URL added successfully");
      }

      setForm({
        publisher_id: "",
        name: "",
        geo: "",
        carrier: "",
        type: "CPA",
        payout: "",
        cap_daily: "",
        cap_total: "",
        hold_percent: "",
        landing_page_url: "",
      });
      setIsEditing(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("⚠️ Failed to save tracking URL");
    }
  };

  const editTracking = (item) => {
    setForm({ ...item });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("✅ URL copied to clipboard!");
  };

  const filteredLinks = trackingLinks.filter((t) => {
    const lower = search.toLowerCase();
    return (
      t.publisher_name?.toLowerCase().includes(lower) ||
      t.geo?.toLowerCase().includes(lower) ||
      t.carrier?.toLowerCase().includes(lower) ||
      t.name?.toLowerCase().includes(lower)
    );
  });

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-3">Publisher Tracking URLs</h2>

      <div className="grid grid-cols-5 gap-3 mb-4">
        <select
          value={form.publisher_id}
          onChange={(e) => setForm({ ...form, publisher_id: e.target.value })}
          className="border p-2 rounded"
        >
          <option value="">Select Publisher</option>
          {publishers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <input
          placeholder="Offer Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          placeholder="Geo"
          value={form.geo}
          onChange={(e) => setForm({ ...form, geo: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          placeholder="Carrier"
          value={form.carrier}
          onChange={(e) => setForm({ ...form, carrier: e.target.value })}
          className="border p-2 rounded"
        />
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          className="border p-2 rounded"
        >
          <option>CPA</option>
          <option>CPI</option>
          <option>CPL</option>
          <option>CPS</option>
          <option>INAPP</option>
        </select>
      </div>

      <div className="grid grid-cols-5 gap-3 mb-4">
        <input
          placeholder="Payout"
          value={form.payout}
          onChange={(e) => setForm({ ...form, payout: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          placeholder="Cap Daily"
          value={form.cap_daily}
          onChange={(e) => setForm({ ...form, cap_daily: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          placeholder="Cap Total"
          value={form.cap_total}
          onChange={(e) => setForm({ ...form, cap_total: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          placeholder="Hold %"
          value={form.hold_percent}
          onChange={(e) => setForm({ ...form, hold_percent: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          placeholder="Landing Page URL"
          value={form.landing_page_url}
          onChange={(e) => setForm({ ...form, landing_page_url: e.target.value })}
          className="border p-2 rounded"
        />
      </div>

      <div className="mb-4">
        <button onClick={saveTracking} className="bg-blue-600 text-white px-4 py-2 rounded">
          {isEditing ? "Update Tracking URL" : "Add Tracking URL"}
        </button>
      </div>

      <input
        type="text"
        placeholder="🔍 Search pub, geo, carrier, name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border p-2 rounded w-1/3 mb-3"
      />

      <table className="min-w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">PUB_ID</th>
            <th className="p-2">Publisher</th>
            <th className="p-2">Name</th>
            <th className="p-2">Geo</th>
            <th className="p-2">Carrier</th>
            <th className="p-2">Type</th>
            <th className="p-2">Payout</th>
            <th className="p-2">Cap</th>
            <th className="p-2">Hold</th>
            <th className="p-2">Landing</th>
            <th className="p-2">Tracking URLs</th>
            <th className="p-2">Edit</th>
          </tr>
        </thead>
        <tbody>
          {filteredLinks.map((t) => (
            <tr key={t.id} className="border-t">
              <td className="p-2 font-mono">{t.pub_code}</td>
              <td className="p-2">{t.publisher_name}</td>
              <td className="p-2">{t.name}</td>
              <td className="p-2">{t.geo}</td>
              <td className="p-2">{t.carrier}</td>
              <td className="p-2">{t.type}</td>
              <td className="p-2">{t.payout}</td>
              <td className="p-2">
                {t.cap_daily} / {t.cap_total}
              </td>
              <td className="p-2">{t.hold_percent}%</td>
              <td className="p-2 truncate max-w-[150px]">{t.landing_page_url}</td>
              <td className="p-2 text-xs text-blue-700">
                {t.type === "INAPP" ? (
                  <div className="flex flex-col gap-1">
                    <button onClick={() => copyToClipboard(t.pin_send_url)} className="hover:underline">
                      🔹 SendPIN
                    </button>
                    <button onClick={() => copyToClipboard(t.pin_verify_url)} className="hover:underline">
                      🔹 VerifyPIN
                    </button>
                    <button onClick={() => copyToClipboard(t.check_status_url)} className="hover:underline">
                      🔹 Status
                    </button>
                    <button onClick={() => copyToClipboard(t.portal_url)} className="hover:underline">
                      🔹 Portal
                    </button>
                  </div>
                ) : (
                  <button onClick={() => copyToClipboard(t.tracking_url)} className="hover:underline">
                    🔹 Click URL
                  </button>
                )}
              </td>
              <td className="p-2">
                <button
                  onClick={() => editTracking(t)}
                  className="bg-yellow-500 text-white px-3 py-1 rounded"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
