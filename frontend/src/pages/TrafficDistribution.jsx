// TrafficDistribution.jsx and DistributionOverview.jsx
// Full clean React implementation with search, overview, rule editor, autofill, fallback, geo/carrier, etc.
// NOTE: This is a skeleton structure ready for integration with your API endpoints.

import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";
import { toast } from "react-toastify";

export default function TrafficDistribution() {
  const [pubId, setPubId] = useState("");
  const [search, setSearch] = useState("");
  const [trackingLinks, setTrackingLinks] = useState([]);
  const [filteredLinks, setFilteredLinks] = useState([]);
  const [selectedLink, setSelectedLink] = useState(null);
  const [meta, setMeta] = useState(null);
  const [rules, setRules] = useState([]);
  const [remaining, setRemaining] = useState(0);

  /* ------------------------------
      LOAD TRACKING LINKS
  ------------------------------ */
  const loadTrackingLinks = async () => {
    try {
      const res = await apiClient.get(`/distribution/tracking-links?pub_id=${pubId}`);
      if (res.data.success) {
        setTrackingLinks(res.data.links);
        setFilteredLinks(res.data.links);
      }
    } catch (err) {
      toast.error("Failed to load tracking links");
    }
  };

  useEffect(() => {
    if (!search.trim()) {
      setFilteredLinks(trackingLinks);
    } else {
      setFilteredLinks(
        trackingLinks.filter((t) =>
          t.tracking_id.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, trackingLinks]);

  /* ------------------------------
      LOAD META + RULES
  ------------------------------ */
  const loadMeta = async () => {
    if (!selectedLink) return;
    try {
      const res = await apiClient.get(
        `/distribution/meta?pub_id=${pubId}&tracking_link_id=${selectedLink}`
      );
      if (res.data.success) setMeta(res.data.meta);
    } catch (err) {
      toast.error("Meta load failed");
    }
  };

  const loadRules = async () => {
    if (!selectedLink) return;
    try {
      const res = await apiClient.get(
        `/distribution/rules?pub_id=${pubId}&tracking_link_id=${selectedLink}`
      );
      if (res.data.success) setRules(res.data.rules);
    } catch (err) {
      toast.error("Rules load failed");
    }
  };

  const loadRemaining = async () => {
    if (!selectedLink) return;
    try {
      const res = await apiClient.get(
        `/distribution/rules/remaining?pub_id=${pubId}&tracking_link_id=${selectedLink}`
      );
      if (res.data.success) setRemaining(res.data.remaining);
    } catch (err) {}
  };

  useEffect(() => {
    if (selectedLink) {
      loadMeta();
      loadRules();
      loadRemaining();
    }
  }, [selectedLink]);

  /* ------------------------------
      ADD RULE
  ------------------------------ */
  const addRule = async () => {
    const offer = prompt("Offer ID");
    const geo = prompt("GEO (optional)");
    const carrier = prompt("Carrier (optional)");
    const weight = prompt(`Weight (remaining: ${remaining}%) or leave blank for AutoFill`);
    const fallback = window.confirm("Set as fallback?");

    const payload = {
      pub_id: pubId,
      tracking_link_id: selectedLink,
      offer_id: offer,
      geo,
      carrier,
      is_fallback: fallback,
      weight: weight ? Number(weight) : null,
      autoFill: !weight,
    };

    try {
      const res = await apiClient.post("/distribution/rules", payload);
      if (res.data.success) {
        toast.success("Rule added");
        loadRules();
        loadRemaining();
      } else toast.error(res.data.error);
    } catch (err) {
      toast.error("Add failed");
    }
  };

  /* ------------------------------
      UPDATE RULE
  ------------------------------ */
  const updateRule = async (r) => {
    const newOffer = prompt("Offer ID", r.offer_id);
    const newGeo = prompt("GEO", r.geo);
    const newCarrier = prompt("Carrier", r.carrier);
    const newWeight = prompt(`Weight (remaining: ${remaining}%)`, r.weight);
    const fallback = window.confirm("Is fallback?");

    const payload = {
      pub_id: pubId,
      tracking_link_id: selectedLink,
      offer_id: newOffer,
      geo: newGeo,
      carrier: newCarrier,
      is_fallback: fallback,
      weight: newWeight ? Number(newWeight) : null,
      autoFill: !newWeight,
    };

    try {
      const res = await apiClient.put(`/distribution/rules/${r.id}`, payload);
      if (res.data.success) {
        toast.success("Rule updated");
        loadRules();
        loadRemaining();
      }
    } catch (err) {
      toast.error("Update failed");
    }
  };

  /* ------------------------------
      DELETE RULE
  ------------------------------ */
  const deleteRule = async (id) => {
    if (!window.confirm("Delete rule?")) return;
    try {
      await apiClient.delete(`/distribution/rules/${id}`);
      toast.success("Rule deleted");
      loadRules();
      loadRemaining();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Traffic Distribution</h2>

      {/* Publisher input */}
      <div className="flex gap-4 items-center">
        <input
          className="border p-2"
          value={pubId}
          onChange={(e) => setPubId(e.target.value)}
          placeholder="Enter PUB ID (PUB01)"
        />
        <button
          className="bg-blue-600 text-white px-4 py-2"
          onClick={loadTrackingLinks}
        >
          Load
        </button>
      </div>

      {/* Searchbar */}
      <input
        className="border p-2 w-full"
        placeholder="Search tracking links..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Tracking Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredLinks.map((t) => (
          <div
            key={t.tracking_link_id}
            className={`p-3 border rounded cursor-pointer ${
              selectedLink === t.tracking_link_id ? "bg-blue-100" : ""
            }`}
            onClick={() => setSelectedLink(t.tracking_link_id)}
          >
            <p className="font-bold">{t.tracking_id}</p>
            <p className="text-sm text-gray-600">{t.base_url}</p>
          </div>
        ))}
      </div>

      {/* Overview */}
      {meta && (
        <div className="p-4 border rounded bg-gray-50">
          <h3 className="font-bold text-lg mb-2">Distribution Overview</h3>
          <p><b>Publisher:</b> {meta.pub_code}</p>
          <p><b>Geo:</b> {meta.geo}</p>
          <p><b>Carrier:</b> {meta.carrier}</p>
          <p><b>Tracking URL:</b> {meta.tracking_url}</p>
          <p><b>Remaining %:</b> {remaining}%</p>
        </div>
      )}

      {/* Rules */}
      {selectedLink && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg">Rules</h3>
            <button className="bg-green-600 text-white px-4 py-2" onClick={addRule}>
              + Add Rule
            </button>
          </div>

          <table className="w-full border text-sm">
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
                  <td className="p-2 border">{r.weight}%</td>
                  <td className="p-2 border">{r.is_fallback ? "YES" : "NO"}</td>
                  <td className="p-2 border flex gap-3">
                    <button
                      className="bg-yellow-600 text-white px-3 py-1"
                      onClick={() => updateRule(r)}
                    >
                      Edit
                    </button>
                    <button
                      className="bg-red-600 text-white px-3 py-1"
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
    </div>
  );
}
