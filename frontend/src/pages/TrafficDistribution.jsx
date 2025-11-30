import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";
import { toast } from "react-toastify";

export default function TrafficDistribution() {
  const [pubId, setPubId] = useState("");
  const [trackingLinks, setTrackingLinks] = useState([]);
  const [selectedLink, setSelectedLink] = useState(null);
  const [meta, setMeta] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);

  /* -------------------------------
        FETCH TRACKING LINKS
  ------------------------------- */
  const loadTrackingLinks = async () => {
    try {
      // FIXED API
      const res = await apiClient.get(`/distribution/meta?pub_id=${pubId}`);

      setTrackingLinks(res.data); // backend returns array
    } catch (err) {
      console.error(err);
      toast.error("Error loading tracking links");
    }
  };

  /* -------------------------------
        FETCH META
  ------------------------------- */
  const loadMeta = async () => {
    try {
      setLoading(true);

      const res = await apiClient.get(`/distribution/meta?pub_id=${pubId}`);

      const row = res.data.find((x) => x.tracking_link_id === selectedLink);
      setMeta(row || null);
    } catch (err) {
      console.error(err);
      toast.error("Meta load error");
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------
        FETCH RULES
  ------------------------------- */
  const loadRules = async () => {
    try {
      // FIXED API
      const res = await apiClient.get(
        `/distribution?tracking_link_id=${selectedLink}`
      );

      setRules(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Rules load error");
    }
  };

  useEffect(() => {
    if (pubId) loadTrackingLinks();
  }, [pubId]);

  useEffect(() => {
    if (selectedLink) {
      loadMeta();
      loadRules();
    }
  }, [selectedLink]);

  /* -------------------------------
        ADD NEW RULE
  ------------------------------- */
  const addRule = async () => {
    try {
      const offer_id = prompt("Enter Offer ID:");
      const percentage = prompt("Enter Weight (%):");

      // FIXED API
      const res = await apiClient.post("/distribution", {
        tracking_link_id: selectedLink,
        offer_id,
        geo: "ALL",
        carrier: "ALL",
        percentage,
        is_fallback: false,
      });

      toast.success("Rule Added");
      loadRules();
    } catch (err) {
      console.error(err);
      toast.error("Add rule error");
    }
  };

  /* -------------------------------
        UPDATE RULE
  ------------------------------- */
  const updateRule = async (rule) => {
    try {
      const newOffer = prompt("New Offer ID:", rule.offer_id);
      const newWeight = prompt("New Percentage:", rule.percentage);

      // FIXED API
      await apiClient.put(`/distribution/${rule.id}`, {
        offer_id: newOffer,
        percentage: newWeight,
        geo: rule.geo,
        carrier: rule.carrier,
        is_fallback: rule.is_fallback,
        daily_cap: rule.daily_cap,
        hourly_cap: rule.hourly_cap,
        status: rule.status,
      });

      toast.success("Rule Updated");
      loadRules();
    } catch (err) {
      console.error(err);
      toast.error("Update failed");
    }
  };

  /* -------------------------------
        DELETE RULE
  ------------------------------- */
  const deleteRule = async (id) => {
    try {
      await apiClient.delete(`/distribution/${id}`);
      toast.success("Rule Deleted");
      loadRules();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Traffic Distribution</h2>

      {/* Publisher ID Input */}
      <div className="mb-4">
        <label>PUB ID</label>
        <input
          className="border p-2 ml-2"
          value={pubId}
          onChange={(e) => setPubId(e.target.value)}
          placeholder="PUB01"
        />
      </div>

      {/* Tracking Links */}
      {trackingLinks.length > 0 && (
        <div className="mb-4">
          <label>Select Tracking Link</label>
          <select
            className="border p-2 ml-2"
            onChange={(e) => setSelectedLink(Number(e.target.value))}
          >
            <option>Select...</option>
            {trackingLinks.map((t) => (
              <option key={t.tracking_link_id} value={t.tracking_link_id}>
                {t.tracking_link_id} — {t.tracking_url}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Meta Section */}
      {selectedLink && meta && (
        <div className="p-4 border rounded mb-6">
          <h3 className="font-bold text-lg">Meta Info</h3>
          <p>Offer: {meta.offer_name}</p>
        </div>
      )}

      {/* Rules */}
      {selectedLink && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-lg">Rules</h3>
            <button className="bg-blue-600 text-white px-4 py-2" onClick={addRule}>
              + Add Rule
            </button>
          </div>

          <table className="w-full border">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2 border">Offer ID</th>
                <th className="p-2 border">Percentage</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td className="p-2 border">{rule.offer_id}</td>
                  <td className="p-2 border">{rule.percentage}%</td>
                  <td className="p-2 border flex gap-2">
                    <button
                      className="bg-yellow-500 text-white px-3 py-1"
                      onClick={() => updateRule(rule)}
                    >
                      Edit
                    </button>
                    <button
                      className="bg-red-600 text-white px-3 py-1"
                      onClick={() => deleteRule(rule.id)}
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
