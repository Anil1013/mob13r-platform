import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";
import { toast } from "react-toastify";

/* ------------------------------------------------------------------
   INLINE RULE MODAL (no separate file)
------------------------------------------------------------------ */
function RuleModal({ open, onClose, onSaved, pubId, trackingLink, offers, remaining, editRule }) {
  if (!open) return null;

  const [offerId, setOfferId] = useState(editRule?.offer_id || "");
  const [geo, setGeo] = useState(editRule?.geo || trackingLink.geo || "ALL");
  const [carrier, setCarrier] = useState(editRule?.carrier || trackingLink.carrier || "ALL");
  const [weight, setWeight] = useState(editRule ? editRule.weight : "");
  const [fallback, setFallback] = useState(editRule?.is_fallback || false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!offerId) return toast.error("Select offer");

    const payload = {
      pub_id: pubId,
      tracking_link_id: trackingLink.tracking_link_id,
      offer_id: offerId,
      geo,
      carrier,
      is_fallback: fallback,
      weight: weight ? Number(weight) : null,
      autoFill: !weight,
    };

    try {
      setSaving(true);

      if (editRule) {
        await apiClient.put(`/distribution/rules/${editRule.id}`, payload);
      } else {
        await apiClient.post(`/distribution/rules`, payload);
      }

      toast.success("Rule saved");
      onSaved();
      onClose();
    } catch (e) {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{editRule ? "Edit Rule" : "Add Rule"}</h2>
          <button className="text-xl" onClick={onClose}>×</button>
        </div>

        {/* Select Offer */}
        <label className="block text-sm font-medium mb-1">Offer *</label>
        <select
          value={offerId}
          onChange={(e) => setOfferId(e.target.value)}
          className="border rounded p-2 w-full mb-4"
        >
          <option value="">Select Offer</option>
          {offers.map((o) => (
            <option key={o.id} value={o.id}>
              {o.id} — {o.name}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold">GEO</label>
            <input
              value={geo}
              onChange={(e) => setGeo(e.target.value)}
              className="border rounded p-2 w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold">Carrier</label>
            <input
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="border rounded p-2 w-full"
            />
          </div>
        </div>

        <label className="block mt-4 text-xs font-semibold">
          Weight (Remaining: {remaining}%)
        </label>
        <input
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="border rounded p-2 w-full"
          placeholder="Leave empty for AutoFill"
        />

        <label className="flex items-center gap-2 mt-4">
          <input
            type="checkbox"
            checked={fallback}
            onChange={(e) => setFallback(e.target.checked)}
          />
          Mark as fallback rule
        </label>

        <div className="flex justify-end gap-3 mt-6">
          <button className="border px-4 py-2 rounded" onClick={onClose}>Cancel</button>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   MAIN PAGE
------------------------------------------------------------------ */
export default function TrafficDistribution() {

  const [pubId, setPubId] = useState("");
  const [links, setLinks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [rules, setRules] = useState([]);
  const [remaining, setRemaining] = useState(0);
  const [offers, setOffers] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editRule, setEditRule] = useState(null);

  /* ------------------------------
     LOAD Tracking Links
  ------------------------------ */
  const loadLinks = async () => {
    try {
      const res = await apiClient.get(`/distribution/tracking-links?pub_id=${pubId}`);
      if (res.data.success) {
        setLinks(res.data.links);
        setSelected(null);
      }
    } catch {
      toast.error("Invalid PUB ID");
    }
  };

  /* ------------------------------
     SELECT Link Load Meta + Rules + Offers
  ------------------------------ */
  const loadRules = async (link) => {
    const { tracking_link_id, geo, carrier } = link;

    const r1 = await apiClient.get(`/distribution/rules?pub_id=${pubId}&tracking_link_id=${tracking_link_id}`);
    setRules(r1.data.rules);

    const r2 = await apiClient.get(`/distribution/rules/remaining?pub_id=${pubId}&tracking_link_id=${tracking_link_id}`);
    setRemaining(r2.data.remaining);

    const r3 = await apiClient.get(`/distribution/offers?geo=${geo}&carrier=${carrier}`);
    setOffers(r3.data.offers);
  };

  const selectLink = async (link) => {
    setSelected(link);
    await loadRules(link);
  };

  /* ------------------------------
     Required Params Toggle (instant update)
  ------------------------------ */
  const toggleParam = async (link, key) => {
    const upd = {
      ...link.required_params,
      [key]: !link.required_params[key]
    };

    await apiClient.put(`/distribution/update-required-params/${link.tracking_link_id}`, {
      required_params: upd
    });

    toast.success("Updated");

    // update UI locally
    setSelected({
      ...link,
      required_params: upd
    });
  };

  /* ------------------------------
     Delete Rule
  ------------------------------ */
  const deleteRule = async (id) => {
    if (!window.confirm("Delete rule?")) return;
    await apiClient.delete(`/distribution/rules/${id}`);
    await loadRules(selected);
    toast.success("Rule deleted");
  };

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-2xl font-bold">Traffic Distribution</h1>

      {/* PUB Input */}
      <div className="flex gap-4">
        <input
          className="border p-2 rounded w-60"
          placeholder="PUB01 / PUB02"
          value={pubId}
          onChange={(e) => setPubId(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={loadLinks}
        >
          Load
        </button>
      </div>

      {/* Tracking Links List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {links.map((l) => (
          <div
            key={l.tracking_link_id}
            onClick={() => selectLink(l)}
            className={`p-4 border rounded cursor-pointer ${selected?.tracking_link_id === l.tracking_link_id ? "bg-blue-50 border-blue-600" : ""}`}
          >
            <div className="font-bold">{l.tracking_id}</div>
            <div className="text-xs text-gray-600">{l.tracking_url}</div>
          </div>
        ))}
      </div>

      {/* Overview */}
      {selected && (
        <div className="p-4 border rounded space-y-2 bg-gray-50">
          <h2 className="font-bold text-lg mb-2">Overview</h2>

          <p><b>Publisher:</b> {selected.publisher_name}</p>
          <p><b>GEO:</b> {selected.geo}</p>
          <p><b>Carrier:</b> {selected.carrier}</p>
          <p><b>URL:</b> {selected.tracking_url}</p>

          {/* Required Params */}
          <div className="mt-3">
            <h3 className="font-semibold mb-2">Required Parameters</h3>
            <div className="flex flex-wrap gap-2">
              {Object.keys(selected.required_params).map((k) => (
                <button
                  key={k}
                  onClick={() => toggleParam(selected, k)}
                  className={`px-3 py-1 rounded border text-sm ${
                    selected.required_params[k]
                      ? "bg-green-600 text-white border-green-700"
                      : "bg-white"
                  }`}
                >
                  {k.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rules */}
      {selected && (
        <div className="border rounded p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-lg">Rules</h3>
            <button
              className="bg-green-600 text-white px-4 py-2 rounded"
              onClick={() => {
                setEditRule(null);
                setShowModal(true);
              }}
            >
              + Add Rule
            </button>
          </div>

          <table className="w-full text-sm border">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2 border">Offer</th>
                <th className="p-2 border">GEO</th>
                <th className="p-2 border">Carrier</th>
                <th className="p-2 border">Weight</th>
                <th className="p-2 border">Fallback</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td className="p-2 border">{r.offer_id}</td>
                  <td className="p-2 border">{r.geo}</td>
                  <td className="p-2 border">{r.carrier}</td>
                  <td className="p-2 border">{r.weight}</td>
                  <td className="p-2 border">{r.is_fallback ? "YES" : "NO"}</td>
                  <td className="p-2 border flex gap-2">
                    <button
                      className="bg-yellow-600 text-white px-3 py-1 rounded"
                      onClick={() => {
                        setEditRule(r);
                        setShowModal(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="bg-red-600 text-white px-3 py-1 rounded"
                      onClick={() => deleteRule(r.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <RuleModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSaved={() => loadRules(selected)}
        pubId={pubId}
        trackingLink={selected}
        offers={offers}
        remaining={remaining}
        editRule={editRule}
      />
    </div>
  );
}
