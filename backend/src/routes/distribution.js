// frontend/src/components/RuleModal.jsx

import React, { useState } from "react";
import apiClient from "../api/apiClient";

export default function RuleModal({
  rule,
  pubId,
  trackingLinkId,
  offers,
  remaining,
  onSaved,
  onClose,
}) {
  const [offerId, setOfferId] = useState(rule?.offer_id || "");
  const [geo, setGeo] = useState(rule?.geo || "ALL");
  const [carrier, setCarrier] = useState(rule?.carrier || "ALL");
  const [weight, setWeight] = useState(
    rule?.weight !== undefined && rule?.weight !== null ? String(rule.weight) : ""
  );
  const [fallback, setFallback] = useState(!!rule?.is_fallback);
  const [status, setStatus] = useState(rule?.status || "active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!offerId) {
      setError("Offer is required");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      pub_id: pubId,
      tracking_link_id: trackingLinkId,
      offer_id: offerId,
      geo,
      carrier,
      is_fallback: fallback,
      weight: weight ? Number(weight) : null,
      autoFill: !weight,
      status,
    };

    try {
      if (rule) {
        await apiClient.put(`/distribution/rules/${rule.id}`, payload);
      } else {
        await apiClient.post(`/distribution/rules`, payload);
      }
      await onSaved();
    } catch (e) {
      console.error(e);
      setError("Failed to save rule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex justify-between items-center mb-1">
          <h2 className="font-bold text-lg">
            {rule ? "Edit Rule" : "Add Rule"}
          </h2>
          <button
            className="text-gray-500 hover:text-black text-xl leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {error && (
          <div className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
            {error}
          </div>
        )}

        {/* Offer dropdown */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Offer <span className="text-red-500">*</span>
          </label>
          <select
            className="border rounded p-2 w-full text-sm"
            value={offerId}
            onChange={(e) => setOfferId(e.target.value)}
          >
            <option value="">Select Offer</option>
            {offers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.id} — {o.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Only active offers for this GEO &amp; carrier are listed.
          </p>
        </div>

        {/* GEO */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">GEO</label>
            <input
              className="border rounded p-2 w-full text-sm"
              value={geo}
              onChange={(e) => setGeo(e.target.value)}
            />
          </div>

          {/* Carrier */}
          <div>
            <label className="block text-sm font-medium mb-1">Carrier</label>
            <input
              className="border rounded p-2 w-full text-sm"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
            />
          </div>
        </div>

        {/* Weight */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Weight (%)
          </label>
          <input
            className="border rounded p-2 w-full text-sm"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={`Leave blank for AutoFill (Remaining ${remaining}%)`}
          />
          <p className="text-xs text-gray-500 mt-1">
            If empty, system will AutoFill remaining % for this link.
          </p>
        </div>

        {/* Fallback + Status */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={fallback}
              onChange={(e) => setFallback(e.target.checked)}
            />
            <span>Fallback rule</span>
          </label>

          <div>
            <label className="block text-xs font-medium mb-1">
              Status
            </label>
            <select
              className="border rounded p-1 text-xs"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="deleted">deleted</option>
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            className="px-4 py-2 text-sm rounded border"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 text-sm rounded bg-green-600 text-white disabled:opacity-60"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}
