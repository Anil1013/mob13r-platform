import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function PublisherTracking() {
  const [links, setLinks] = useState([]);
  const [publishers, setPublishers] = useState([]);
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
    status: "active",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [copiedUrl, setCopiedUrl] = useState(null);

  const fetchAll = async () => {
    const [pubRes, linkRes] = await Promise.all([
      apiClient.get("/publishers"),
      apiClient.get("/publisher-tracking"),
    ]);
    setPublishers(pubRes.data || []);
    setLinks(linkRes.data || []);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const resetForm = () => {
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
      status: "active",
    });
    setIsEditing(false);
    setEditId(null);
  };

  const save = async () => {
    try {
      if (isEditing) await apiClient.put(`/publisher-tracking/${editId}`, form);
      else await apiClient.post("/publisher-tracking", form);
      alert("✅ Saved");
      resetForm();
      fetchAll();
    } catch (err) {
      alert("⚠️ " + (err.response?.data?.error || err.message));
    }
  };

  const edit = (l) => {
    setForm({
      pub_id: l.pub_id,
      name: l.name,
      geo: l.geo,
      carrier: l.carrier,
      type: l.type,
      payout: l.payout,
      cap_daily: l.cap_daily,
      cap_total: l.cap_total,
      hold_percent: l.hold_percent,
      landing_page_url: l.landing_page_url,
      status: l.status,
    });
    setIsEditing(true);
    setEditId(l.id);
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this link?")) return;
    await apiClient.delete(`/publisher-tracking/${id}`);
    fetchAll();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const filtered = links.filter((l) =>
    [l.pub_id, l.publisher_name_db, l.geo, l.carrier, l.name]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Publisher Tracking URLs</h2>

      {/* ===== FORM ===== */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <select
          className="border p-2 rounded"
          value={form.pub_id}
          onChange={(e) => setForm({ ...form, pub_id: e.target.value })}
        >
          <option value="">Select Publisher</option>
          {publishers.map((p) => (
            <option key={p.publisher_id} value={p.publisher_id}>
              {p.publisher_id} - {p.name}
            </option>
          ))}
        </select>

        <input placeholder="Offer Name" className="border p-2 rounded"
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Geo" className="border p-2 rounded"
          value={form.geo} onChange={(e) => setForm({ ...form, geo: e.target.value })} />
        <input placeholder="Carrier" className="border p-2 rounded"
          value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} />

        <select className="border p-2 rounded"
          value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option>CPA</option>
          <option>CPI</option>
          <option>CPL</option>
          <option>CPS</option>
          <option>INAPP</option>
        </select>

        <input placeholder="Payout" className="border p-2 rounded"
          value={form.payout} onChange={(e) => setForm({ ...form, payout: e.target.value })} />
        <input placeholder="Cap Daily" className="border p-2 rounded"
          value={form.cap_daily} onChange={(e) => setForm({ ...form, cap_daily: e.target.value })} />
        <input placeholder="Cap Total" className="border p-2 rounded"
          value={form.cap_total} onChange={(e) => setForm({ ...form, cap_total: e.target.value })} />
        <input placeholder="Hold %" className="border p-2 rounded"
          value={form.hold_percent} onChange={(e) => setForm({ ...form, hold_percent: e.target.value })} />
        <input placeholder="Landing Page URL" className="border p-2 rounded col-span-2"
          value={form.landing_page_url} onChange={(e) => setForm({ ...form, landing_page_url: e.target.value })} />
      </div>

      <div className="mb-4 flex gap-2">
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={save}>
          {isEditing ? "Update" : "Add"} Tracking URL
        </button>
        {isEditing && (
          <button className="bg-gray-400 text-white px-4 py-2 rounded" onClick={resetForm}>
            Cancel
          </button>
        )}
      </div>

      <input className="border p-2 rounded w-1/3 mb-3"
        placeholder="🔍 Search pub, geo, carrier, name..."
        value={search} onChange={(e) => setSearch(e.target.value)} />

      {/* ===== TABLE ===== */}
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
          {filtered.map((l) => (
            <tr key={l.id} className="border-t">
              <td className="p-2">{l.pub_id}</td>
              <td className="p-2">{l.publisher_name_db || l.publisher_name}</td>
              <td className="p-2">{l.name}</td>
              <td className="p-2">{l.geo}</td>
              <td className="p-2">{l.carrier}</td>
              <td className="p-2">{l.type}</td>
              <td className="p-2">{l.payout}</td>
              <td className="p-2">{l.cap_daily}/{l.cap_total}</td>
              <td className="p-2">{l.hold_percent}%</td>
              <td className="p-2 break-all">{l.landing_page_url}</td>

              <td className="p-2 break-all">
                {l.type === "INAPP" ? (
                  <>
                    <div className="mb-1 flex items-center gap-1">
                      <strong>Pin Send:</strong>
                      <button onClick={() => copyToClipboard(l.pin_send_url)}
                        className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                        Copy
                      </button>
                      <span className="text-gray-700">{l.pin_send_url}</span>
                    </div>

                    <div className="mb-1 flex items-center gap-1">
                      <strong>Verify:</strong>
                      <button onClick={() => copyToClipboard(l.pin_verify_url)}
                        className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                        Copy
                      </button>
                      <span className="text-gray-700">{l.pin_verify_url}</span>
                    </div>

                    <div className="mb-1 flex items-center gap-1">
                      <strong>Status:</strong>
                      <button onClick={() => copyToClipboard(l.check_status_url)}
                        className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                        Copy
                      </button>
                      <span className="text-gray-700">{l.check_status_url}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <strong>Portal:</strong>
                      <button onClick={() => copyToClipboard(l.portal_url)}
                        className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                        Copy
                      </button>
                      <span className="text-gray-700">{l.portal_url}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-1">
                    <button onClick={() => copyToClipboard(l.tracking_url)}
                      className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                      Copy
                    </button>
                    <span className="text-gray-700">{l.tracking_url}</span>
                  </div>
                )}

                {copiedUrl && copiedUrl.includes(l.pub_id) && (
                  <div className="text-green-600 text-xs mt-1">Copied ✅</div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
