// frontend/src/pages/TrafficDistribution.jsx
import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function TrafficDistribution() {
  const [trackingLinks, setTrackingLinks] = useState([]);
  const [selectedTL, setSelectedTL] = useState(null); // tracking link object
  const [offers, setOffers] = useState([]);
  const [distributions, setDistributions] = useState([]);
  const [loading, setLoading] = useState(false);

  // form to add / edit
  const [form, setForm] = useState({
    id: null, // distribution id when editing
    offer_id: "",
    percentage: "",
    sequence_order: 0,
  });

  // Load tracking links (PUBs) and optionally distributions
  const fetchTrackingLinks = async () => {
    try {
      const res = await apiClient.get("/tracking");
      setTrackingLinks(res.data || []);
    } catch (err) {
      console.error("Failed to load tracking links", err);
      alert("⚠️ Failed to load tracking links");
    }
  };

  useEffect(() => {
    fetchTrackingLinks();
  }, []);

  // When a tracking link (PUB) is selected:
  const onSelectTracking = async (id) => {
    setSelectedTL(null);
    setOffers([]);
    setDistributions([]);
    setForm({ id: null, offer_id: "", percentage: "", sequence_order: 0 });

    if (!id) return;
    const tl = trackingLinks.find((t) => t.id === Number(id));
    setSelectedTL(tl);

    // load offers for geo/carrier
    try {
      const resOff = await apiClient.get("/distribution/offers", {
        params: { geo: tl.geo, carrier: tl.carrier },
      });
      setOffers(resOff.data || []);
    } catch (err) {
      console.error("Failed to load offers", err);
      setOffers([]);
    }

    // load existing distribution rows for this tracking link
    try {
      const resDist = await apiClient.get("/distribution", {
        params: { tracking_link_id: id },
      });
      setDistributions(resDist.data || []);
    } catch (err) {
      console.error("Failed to load distributions", err);
      setDistributions([]);
    }
  };

  const resetForm = () => {
    setForm({ id: null, offer_id: "", percentage: "", sequence_order: 0 });
  };

  const handleSave = async () => {
    if (!selectedTL) return alert("Select PUB first");
    if (!form.offer_id) return alert("Select offer");
    const percent = Number(form.percentage);
    if (!percent || percent <= 0) return alert("Enter valid percentage > 0");

    try {
      if (form.id) {
        // update
        await apiClient.put(`/distribution/${form.id}`, {
          offer_id: form.offer_id,
          percentage: percent,
          sequence_order: form.sequence_order,
        });
        alert("✅ Updated distribution row");
      } else {
        // create
        await apiClient.post("/distribution", {
          tracking_link_id: selectedTL.id,
          offer_id: form.offer_id,
          percentage: percent,
          sequence_order: form.sequence_order,
        });
        alert("✅ Added distribution row");
      }
      // refresh
      onSelectTracking(selectedTL.id);
      resetForm();
    } catch (err) {
      const msg = err?.response?.data?.error || err.message;
      alert("⚠️ " + msg);
    }
  };

  const handleEdit = (row) => {
    setForm({
      id: row.id,
      offer_id: row.offer_id,
      percentage: row.percentage,
      sequence_order: row.sequence_order,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this distribution row?")) return;
    try {
      await apiClient.delete(`/distribution/${id}`);
      alert("🗑️ Deleted");
      onSelectTracking(selectedTL.id);
    } catch (err) {
      alert("⚠️ Failed to delete");
    }
  };

  // helper: show sum percentages
  const sumPercent = distributions.reduce((s, r) => s + (r.percentage || 0), 0);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Traffic Distribution</h2>

      {/* Pick PUB (tracking link) */}
      <div className="mb-4 grid grid-cols-3 gap-3 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Select PUB (tracking link)</label>
          <select
            className="border p-2 rounded w-full"
            onChange={(e) => onSelectTracking(e.target.value)}
            defaultValue=""
          >
            <option value="">-- Select PUB --</option>
            {trackingLinks.map((t) => (
              <option key={t.id} value={t.id}>
                {`PUB${t.id} • ${t.publisher_name || t.pub_id || "Publisher"} • ${t.geo}/${t.carrier}`}
              </option>
            ))}
          </select>
        </div>

        {/* Auto filled fields */}
        <div>
          <label className="block text-sm font-medium mb-1">Publisher</label>
          <input type="text" readOnly className="border p-2 rounded w-full" value={selectedTL?.publisher_name || ""} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Geo / Carrier</label>
          <input
            type="text"
            readOnly
            className="border p-2 rounded w-full"
            value={selectedTL ? `${selectedTL.geo} / ${selectedTL.carrier}` : ""}
          />
        </div>
      </div>

      {/* Add/Edit Form */}
      <div className="mb-6 p-4 border rounded">
        <h3 className="font-semibold mb-2">{form.id ? "Edit" : "Add"} distribution row</h3>

        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Offer (targeting)</label>
            <select
              className="border p-2 rounded w-full"
              value={form.offer_id}
              onChange={(e) => setForm({ ...form, offer_id: e.target.value })}
            >
              <option value="">-- Select offer --</option>
              {offers.map((o) => (
                <option key={o.offer_id} value={o.offer_id}>
                  {`${o.offer_id} • ${o.name} • payout:${o.payout}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Percentage (%)</label>
            <input
              type="number"
              min="1"
              max="100"
              className="border p-2 rounded w-full"
              value={form.percentage}
              onChange={(e) => setForm({ ...form, percentage: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Sequence (optional)</label>
            <input
              type="number"
              className="border p-2 rounded w-full"
              value={form.sequence_order}
              onChange={(e) => setForm({ ...form, sequence_order: Number(e.target.value) })}
            />
          </div>

          <div className="flex items-end gap-2">
            <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded">
              {form.id ? "Update" : "Add"}
            </button>
            {form.id && (
              <button onClick={() => { resetForm(); }} className="bg-gray-400 text-white px-4 py-2 rounded">
                Cancel
              </button>
            )}
          </div>
        </div>

        <p className="mt-3 text-sm text-gray-600">
          Current total percentage for this PUB/geo/carrier: <strong>{sumPercent}%</strong>
        </p>
      </div>

      {/* Distribution table */}
      <h3 className="text-lg font-semibold mb-2">Configured Distribution Rows</h3>
      {distributions.length === 0 ? (
        <p className="text-sm text-gray-500">No distribution rows configured for selected PUB.</p>
      ) : (
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">Offer ID</th>
              <th className="p-2">Offer Name</th>
              <th className="p-2">Percentage</th>
              <th className="p-2">Sequence</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {distributions.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="p-2 font-mono">{d.offer_id}</td>
                <td className="p-2">{d.offer_name}</td>
                <td className="p-2">{d.percentage}%</td>
                <td className="p-2">{d.sequence_order}</td>
                <td className="p-2 flex gap-2">
                  <button onClick={() => handleEdit(d)} className="bg-yellow-500 text-white px-2 py-1 rounded">Edit</button>
                  <button onClick={() => handleDelete(d.id)} className="bg-red-600 text-white px-2 py-1 rounded">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
