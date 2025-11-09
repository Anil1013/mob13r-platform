import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient"; // uses baseURL = backend.mob13r.com/api

export default function PublisherTracking() {
  const [publishers, setPublishers] = useState([]);
  const [trackingLinks, setTrackingLinks] = useState([]);
  const [form, setForm] = useState({
    pub_id: "",
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
  const [search, setSearch] = useState("");

  const fetchAll = async () => {
    try {
      const [pubRes, trackRes] = await Promise.all([
        apiClient.get("/publishers"),
        apiClient.get("/tracking"),
      ]);
      setPublishers(pubRes.data || []);
      setTrackingLinks(trackRes.data || []);
    } catch (err) {
      alert("⚠️ Failed to load tracking data");
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const addTracking = async () => {
    try {
      await apiClient.post("/tracking", form);
      alert("✅ Tracking URL added successfully");
      setForm({
        pub_id: "",
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
      fetchAll();
    } catch (err) {
      alert("⚠️ " + (err.response?.data?.error || err.message));
    }
  };

  const filtered = trackingLinks.filter((t) => {
    const s = search.toLowerCase();
    return (
      t.name?.toLowerCase().includes(s) ||
      t.geo?.toLowerCase().includes(s) ||
      t.carrier?.toLowerCase().includes(s) ||
      t.publisher_name?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Publisher Tracking URLs</h2>

      <div className="grid grid-cols-4 gap-2 mb-3">
        <select
          value={form.pub_id}
          onChange={(e) => setForm({ ...form, pub_id: e.target.value })}
          className="border p-2 rounded"
        >
          <option value="">Select Publisher</option>
          {publishers.map((p) => (
            <option key={p.pub_id} value={p.pub_id}>
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
          onChange={(e) =>
            setForm({ ...form, landing_page_url: e.target.value })
          }
          className="border p-2 rounded col-span-2"
        />
      </div>

      <button
        onClick={addTracking}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Add Tracking URL
      </button>

      <h3 className="text-xl font-semibold mt-6 mb-3">Tracking Links</h3>

      <input
        type="text"
        placeholder="🔍 Search pub, geo, carrier, name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border p-2 rounded mb-3 w-1/3"
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
          </tr>
        </thead>
        <tbody>
          {filtered.map((t) => (
            <tr key={t.id} className="border-t">
              <td className="p-2">{t.pub_id}</td>
              <td className="p-2">{t.publisher_name}</td>
              <td className="p-2">{t.name}</td>
              <td className="p-2">{t.geo}</td>
              <td className="p-2">{t.carrier}</td>
              <td className="p-2">{t.type}</td>
              <td className="p-2">{t.payout}</td>
              <td className="p-2">{t.cap_daily} / {t.cap_total}</td>
              <td className="p-2">{t.hold_percent}%</td>
              <td className="p-2 text-blue-600 truncate max-w-[150px]">
                <a href={t.landing_page_url} target="_blank" rel="noreferrer">
                  {t.landing_page_url}
                </a>
              </td>
              <td className="p-2 text-xs break-words max-w-[250px]">
                {t.tracking_url && (
                  <div>
                    <b>Click:</b> {t.tracking_url}
                  </div>
                )}
                {t.pin_send_url && (
                  <div>
                    <b>PinSend:</b> {t.pin_send_url}
                  </div>
                )}
                {t.pin_verify_url && (
                  <div>
                    <b>PinVerify:</b> {t.pin_verify_url}
                  </div>
                )}
                {t.check_status_url && (
                  <div>
                    <b>Status:</b> {t.check_status_url}
                  </div>
                )}
                {t.portal_url && (
                  <div>
                    <b>Portal:</b> {t.portal_url}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
