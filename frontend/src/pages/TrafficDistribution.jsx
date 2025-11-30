import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function TrafficDistribution() {
  const [pubId, setPubId] = useState("");
  const [trackingLinks, setTrackingLinks] = useState([]);
  const [selectedLink, setSelectedLink] = useState(null);
  const [meta, setMeta] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);

  /* -------------------------------------------
        LOAD TRACKING LINKS (pub_id → pub_code)
  ------------------------------------------- */
  const loadTrackingLinks = async () => {
    try {
      const res = await apiClient.get(
        `/distribution/tracking-links?pub_id=${pubId}`
      );

      if (res.data.success) {
        setTrackingLinks(res.data.links);
      }
    } catch (err) {
      console.error(err);
      alert("Error loading tracking links");
    }
  };

  /* -------------------------------------------
        LOAD META
  ------------------------------------------- */
  const loadMeta = async () => {
    try {
      setLoading(true);

      const res = await apiClient.get(`/distribution/meta?pub_id=${pubId}`);

      if (res.data.success) {
        const data = res.data.meta.find(
          (x) => x.tracking_link_id === selectedLink
        );
        setMeta(data || null);
      }
    } catch (err) {
      console.error(err);
      alert("Error loading meta");
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------------------
        LOAD RULES
  ------------------------------------------- */
  const loadRules = async () => {
    try {
      const res = await apiClient.get(
        `/distribution/rules?pub_id=${pubId}&tracking_link_id=${selectedLink}`
      );

      if (res.data.success) {
        setRules(res.data.rules);
      }
    } catch (err) {
      console.error(err);
      alert("Error loading rules");
    }
  };

  /* Auto-load tracking links when pubId changes */
  useEffect(() => {
    if (pubId.trim() !== "") {
      loadTrackingLinks();
    }
  }, [pubId]);

  /* Auto-load meta + rules when link is selected */
  useEffect(() => {
    if (selectedLink) {
      loadMeta();
      loadRules();
    }
  }, [selectedLink]);

  /* -------------------------------------------
        ADD RULE
  ------------------------------------------- */
  const addRule = async () => {
    try {
      const offer_id = prompt("Enter Offer ID:");
      const weight = prompt("Enter Weight (%):");

      if (!offer_id || !weight) return alert("Invalid input");

      const res = await apiClient.post("/distribution/rules", {
        pub_id: pubId,
        tracking_link_id: selectedLink,
        offer_id,
        weight,
      });

      if (res.data.success) {
        alert("Rule added");
        loadRules();
      }
    } catch (err) {
      console.error(err);
      alert("Add rule error");
    }
  };

  /* -------------------------------------------
        UPDATE RULE
  ------------------------------------------- */
  const updateRule = async (rule) => {
    try {
      const offer_id = prompt("New Offer ID:", rule.offer_id);
      const weight = prompt("New Weight (%):", rule.weight);

      if (!offer_id || !weight) return alert("Invalid input");

      const res = await apiClient.put(`/distribution/rules/${rule.id}`, {
        offer_id,
        weight,
      });

      if (res.data.success) {
        alert("Rule updated");
        loadRules();
      }
    } catch (err) {
      console.error(err);
      alert("Update failed");
    }
  };

  /* -------------------------------------------
        DELETE RULE
  ------------------------------------------- */
  const deleteRule = async (id) => {
    try {
      const res = await apiClient.delete(`/distribution/rules/${id}`);
      if (res.data.success) {
        alert("Rule deleted");
        loadRules();
      }
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Traffic Distribution</h2>

      {/* PUB ID INPUT */}
      <div className="mb-4">
        <label>PUB ID</label>
        <input
          className="border p-2 ml-2"
          placeholder="PUB01"
          value={pubId}
          onChange={(e) => setPubId(e.target.value)}
        />
      </div>

      {/* TRACKING LINKS */}
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
                {t.tracking_link_id} — {t.base_url}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* META SECTION */}
      {selectedLink && meta && (
        <div className="border p-4 mb-6 rounded">
          <h3 className="font-bold text-lg">Meta Info</h3>
          <p>Total Hit: {meta.total_hit}</p>
          <p>Remaining Hit: {meta.remaining_hit}</p>
        </div>
      )}

      {/* RULES SECTION */}
      {selectedLink && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold">Rules</h3>
            <button
              className="bg-blue-600 text-white px-4 py-2"
              onClick={addRule}
            >
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
