import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function PublisherTracking() {
  const [links, setLinks] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    pub_id: "",
    name: "",
    geo: "",
    carrier: "",
    payout: "",
    cap_daily: "",
    cap_total: "",
    conversions_hold: false,
    status: "active",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const fetchLinks = async () => {
    const r = await apiClient.get("/publisher-tracking");
    setLinks(r.data || []);
  };

  useEffect(() => { fetchLinks(); }, []);

  const resetForm = () => {
    setForm({
      pub_id: "",
      name: "",
      geo: "",
      carrier: "",
      payout: "",
      cap_daily: "",
      cap_total: "",
      conversions_hold: false,
      status: "active",
    });
    setIsEditing(false);
    setEditId(null);
  };

  const save = async () => {
    try {
      if (isEditing) {
        await apiClient.put(`/publisher-tracking/${editId}`, form);
      } else {
        await apiClient.post("/publisher-tracking", form);
      }
      alert("✅ Saved");
      resetForm();
      fetchLinks();
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
      payout: l.payout,
      cap_daily: l.cap_daily,
      cap_total: l.cap_total,
      conversions_hold: l.conversions_hold,
      status: l.status,
    });
    setIsEditing(true);
    setEditId(l.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this tracking link?")) return;
    await apiClient.delete(`/publisher-tracking/${id}`);
    fetchLinks();
  };

  const filtered = links.filter((l) =>
    [l.pub_id, l.geo, l.carrier, l.name]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Publisher Tracking URLs</h2>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <input
          placeholder="Publisher ID"
          className="border p-2 rounded"
          value={form.pub_id}
          onChange={(e) => setForm({ ...form, pub_id: e.target.value })}
        />
        <input
          placeholder="Name / Label"
          className="border p-2 rounded"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          placeholder="Geo (e.g. IQ)"
          className="border p-2 rounded"
          value={form.geo}
          onChange={(e) => setForm({ ...form, geo: e.target.value })}
        />
        <input
          placeholder="Carrier (e.g. Zain)"
          className="border p-2 rounded"
          value={form.carrier}
          onChange={(e) => setForm({ ...form, carrier: e.target.value })}
        />
        <input
          placeholder="Payout"
          className="border p-2 rounded"
          value={form.payout}
          onChange={(e) => setForm({ ...form, payout: e.target.value })}
        />
        <input
          placeholder="Cap Daily"
          className="border p-2 rounded"
          value={form.cap_daily}
          onChange={(e) => setForm({ ...form, cap_daily: e.target.value })}
        />
        <input
          placeholder="Cap Total"
          className="border p-2 rounded"
          value={form.cap_total}
          onChange={(e) => setForm({ ...form, cap_total: e.target.value })}
        />
        <label className="flex items-center gap-2 border p-2 rounded">
          <input
            type="checkbox"
            checked={form.conversions_hold}
            onChange={(e) => setForm({ ...form, conversions_hold: e.target.checked })}
          />
          Hold Conversions
        </label>
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

      <div className="mb-3">
        <input
          placeholder="🔍 Search pub, geo, carrier, name..."
          className="border p-2 rounded w-1/3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <table className="min-w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Publisher</th>
            <th className="p-2">Name</th>
            <th className="p-2">Geo</th>
            <th className="p-2">Carrier</th>
            <th className="p-2">Payout</th>
            <th className="p-2">Cap (Daily/Total)</th>
            <th className="p-2">Hold</th>
            <th className="p-2">Tracking URL</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((l) => (
            <tr key={l.id} className="border-t">
              <td className="p-2">{l.pub_id}</td>
              <td className="p-2">{l.name}</td>
              <td className="p-2">{l.geo}</td>
              <td className="p-2">{l.carrier}</td>
              <td className="p-2">{l.payout}</td>
              <td className="p-2">{l.cap_daily} / {l.cap_total}</td>
              <td className="p-2">{l.conversions_hold ? "✅" : "❌"}</td>
              <td className="p-2 text-blue-600 underline cursor-pointer break-all">{l.tracking_url}</td>
              <td className="p-2 flex gap-2">
                <button className="bg-yellow-500 text-white px-3 py-1 rounded" onClick={() => edit(l)}>Edit</button>
                <button className="bg-red-600 text-white px-3 py-1 rounded" onClick={() => remove(l.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
