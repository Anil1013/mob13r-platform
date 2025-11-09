import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function PublisherTracking() {
  const [publishers, setPublishers] = useState([]);
  const [trackingLinks, setTrackingLinks] = useState([]);
  const [search, setSearch] = useState("");
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

  const fetchAll = async () => {
    try {
      const [pubRes, linkRes] = await Promise.all([
        apiClient.get("/api/publishers"), // ✅ Corrected endpoint
        apiClient.get("/api/tracking"),
      ]);
      // Show only active publishers
      setPublishers(pubRes.data.filter((p) => p.status === "active"));
      setTrackingLinks(linkRes.data || []);
    } catch (err) {
      console.error("⚠️ Fetch error:", err);
      alert("Failed to load data.");
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const resetForm = () =>
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

  const saveTracking = async () => {
    try {
      if (!form.pub_id || !form.geo || !form.carrier || !form.name) {
        alert("⚠️ Please fill all mandatory fields.");
        return;
      }

      await apiClient.post("/api/tracking", form);
      alert("✅ Tracking URL created successfully.");
      resetForm();
      fetchAll();
    } catch (err) {
      console.error(err);
      alert("⚠️ Failed to create tracking URL.");
    }
  };

  const filtered = trackingLinks.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.publisher_name?.toLowerCase().includes(q) ||
      t.name?.toLowerCase().includes(q) ||
      t.geo?.toLowerCase().includes(q) ||
      t.carrier?.toLowerCase().includes(q)
    );
  });

  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => alert("📋 Copied to clipboard!"))
      .catch(() => alert("⚠️ Failed to copy!"));
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-3">Publisher Tracking URLs</h2>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {/* Publisher Dropdown */}
        <select
          value={form.pub_id}
          onChange={(e) => setForm({ ...form, pub_id: e.target.value })}
          className="border p-2 rounded"
        >
          <option value="">Select Publisher</option>
          {publishers.map((p) => (
            <option key={p.publisher_id} value={p.publisher_id}>
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
          type="number"
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
          type="number"
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
          className="border p-2 rounded"
        />
      </div>

      <button
        onClick={saveTracking}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
      >
        Add Tracking URL
      </button>

      {/* ===== Search and Table ===== */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="🔍 Search pub, geo, carrier, name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded w-1/3"
        />
      </div>

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
              <td className="p-2">
                {t.cap_daily} / {t.cap_total}
              </td>
              <td className="p-2">{t.hold_percent}%</td>
              <td className="p-2">
                {t.landing_page_url ? (
                  <a
                    href={t.landing_page_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline"
                  >
                    Visit
                  </a>
                ) : (
                  "-"
                )}
              </td>
              <td className="p-2">
                {t.type === "INAPP" ? (
                  <div className="flex flex-col gap-1">
                    {[
                      { label: "SendPin", url: t.pin_send_url },
                      { label: "VerifyPin", url: t.pin_verify_url },
                      { label: "Status", url: t.check_status_url },
                      { label: "Portal", url: t.portal_url },
                    ].map(({ label, url }) => (
                      <div key={label} className="flex items-center gap-2">
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 underline"
                        >
                          {label}
                        </a>
                        <button
                          onClick={() => copyToClipboard(url)}
                          className="text-xs bg-gray-200 px-2 py-0.5 rounded hover:bg-gray-300"
                        >
                          Copy
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <a
                      href={t.tracking_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline"
                    >
                      Link
                    </a>
                    <button
                      onClick={() => copyToClipboard(t.tracking_url)}
                      className="text-xs bg-gray-200 px-2 py-0.5 rounded hover:bg-gray-300"
                    >
                      Copy
                    </button>
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
