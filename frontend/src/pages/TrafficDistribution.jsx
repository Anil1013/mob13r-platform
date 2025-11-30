import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

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
      const res = await apiClient.get(`/distribution/tracking-links?pub_id=${pubId}`);
      if (res.data.success) {
        setTrackingLinks(res.data.links);
      }
    } catch (err) {
      console.error(err);
      alert("Error loading tracking links");
    }
  };

  /* -------------------------------
        FETCH META + RULES
  ------------------------------- */
  const loadMeta = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/distribution/meta?pub_id=${pubId}`);

      if (res.data.success) {
        const row = res.data.meta.find((x) => x.tracking_link_id === selectedLink);
        setMeta(row || null);
      }
    } catch (err) {
      console.error(err);
      alert("Meta load error");
    } finally {
      setLoading(false);
    }
  };

  const loadRules = async () => {
    try {
      const res = await apiClient.get(
        `/distribution/rules?pub_id=${pubId}&tracking_link_id=${selectedLink}`
      );
      if (res.data.success) setRules(res.data.rules);
    } catch (err) {
      console.error(err);
      alert("Rules load error");
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
      const weight = prompt("Enter Weight (%):");

      const res = await apiClient.post("/distribution/rules", {
        pub_id: pubId,
        tracking_link_id: selectedLink,
        offer_id,
        weight,
      });

      if (res.data.success) {
        alert("Rule Added");
        loadRules();
      }
    } catch (err) {
      console.error(err);
      alert("Add rule error");
    }
  };

  /* -------------------------------
        UPDATE RULE
  ------------------------------- */
  const updateRule = async (rule) => {
    try {
      const newOffer = prompt("New Offer ID:", rule.offer_id);
      const newWeight = prompt("New Weight:", rule.weight);

      const res = await apiClient.put(`/distribution/rules/${rule.id}`, {
        offer_id: newOffer,
        weight: newWeight,
      });

      if (res.data.success) {
        alert("Rule Updated");
        loadRules();
      }
    } catch (err) {
      console.error(err);
      alert("Update failed");
    }
  };

  /* -------------------------------
        DELETE RULE
  ------------------------------- */
  const deleteRule = async (id) => {
    try {
      await apiClient.delete(`/distribution/rules/${id}`);
      alert("Rule Deleted");
      loadRules();
    } catch (err) {
      alert("Delete failed");
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
                {t.tracking_id} — {t.base_url}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Meta Section */}
      {selectedLink && meta && (
        <div className="p-4 border rounded mb-6">
          <h3 className="font-bold text-lg">Meta Info</h3>
          <p>Total Hit: {meta.total_hit}</p>
          <p>Remaining Hit: {meta.remaining_hit}</p>
        </div>
      )}

      {/* Rules Section */}
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
                <th className="p-2 border">Weight</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td className="p-2 border">{rule.offer_id}</td>
                  <td className="p-2 border">{rule.weight}%</td>
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
