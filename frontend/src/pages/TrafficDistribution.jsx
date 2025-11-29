import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function TrafficDistribution() {
  const [pubCode, setPubCode] = useState("");
  const [meta, setMeta] = useState(null);
  const [rules, setRules] = useState([]);
  const [offers, setOffers] = useState([]);
  const [remaining, setRemaining] = useState([]);
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setMeta(null);
    setRules([]);
    setOffers([]);
    setRemaining([]);
  };

  const loadMeta = async () => {
    try {
      setLoading(true);
      resetState();

      const res = await apiClient.get("/distribution/meta", {
        params: { pub_id: pubCode },
      });
      if (!res.data?.length) return alert("Publisher not found!");

      setMeta(res.data[0]);
      await loadRules(res.data[0].pub_code);
    } catch (err) {
      console.log("META ERROR:", err);
      alert("Error loading meta");
    } finally {
      setLoading(false);
    }
  };

  const loadRules = async (pub) => {
    try {
      const res = await apiClient.get("/distribution/rules", {
        params: { pub_id: pub },
      });
      setRules(res.data || []);

      const excludeIds = res.data.map((r) => r.offer_id).join(",");
      loadOffers(excludeIds);
      loadRemaining(pub);
    } catch (err) {
      console.log("RULES ERROR:", err);
      alert("Error loading rules");
    }
  };

  const loadOffers = async (excludeIds) => {
    try {
      const res = await apiClient.get("/distribution/offers", {
        params: { exclude: excludeIds }
      });
      setOffers(res.data || []);
    } catch (err) {
      console.log("OFFERS ERROR:", err);
    }
  };

  const loadRemaining = async (pub) => {
    try {
      const res = await apiClient.get("/distribution/rules/remaining", {
        params: { pub_id: pub },
      });
      setRemaining(res.data || []);
    } catch (err) {
      console.log("REMAINING ERROR:", err);
    }
  };

  const updateRule = async (rule) => {
    try {
      await apiClient.put(`/distribution/rules/${rule.id}`, rule);
      alert("Rule Updated");
      loadRules(pubCode);
    } catch (err) {
      console.log("RULE UPDATE ERROR:", err);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-3">Traffic Distribution</h2>

      {/* Input */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={pubCode}
          placeholder="Enter PubCode"
          onChange={(e) => setPubCode(e.target.value.toUpperCase())}
          className="border p-2 rounded w-48"
        />
        <button disabled={loading}
          onClick={loadMeta}
          className="bg-blue-600 text-white px-4 py-2 rounded">
          {loading ? "Loading..." : "Load"}
        </button>
      </div>

      {/* Meta */}
      {meta && (
        <div className="p-4 border rounded bg-gray-50 mb-4">
          <p><strong>Publisher:</strong> {meta.publisher_name}</p>
          <p><strong>Geo:</strong> {meta.geo || "-"}</p>
          <p><strong>Carrier:</strong> {meta.carrier || "-"}</p>
        </div>
      )}

      {/* Rules Table */}
      {rules.length > 0 && (
        <table className="w-full border">
          <thead className="bg-gray-200 text-sm">
            <tr>
              <th>ID</th>
              <th>Offer</th>
              <th>Weight</th>
              <th>Geo</th>
              <th>Carrier</th>
              <th>Daily Cap</th>
              <th>Hour Cap</th>
              <th>Redirect</th>
              <th>Save</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r, idx) => (
              <tr key={r.id} className="text-center border">
                <td>{r.id}</td>
                <td>{r.offer_id}</td>

                <td><input type="number"
                  className="border w-16"
                  value={r.weight}
                  onChange={(e) => {
                    const updated = [...rules];
                    updated[idx].weight = e.target.value;
                    setRules(updated);
                  }}/></td>

                <td><input type="text"
                  className="border w-16"
                  value={r.geo || ""}
                  onChange={(e) => {
                    const updated = [...rules];
                    updated[idx].geo = e.target.value.toUpperCase();
                    setRules(updated);
                  }}/></td>

                <td><input type="text"
                  className="border w-16"
                  value={r.carrier || ""}
                  onChange={(e) => {
                    const updated = [...rules];
                    updated[idx].carrier = e.target.value;
                    setRules(updated);
                  }}/></td>

                <td><input type="number"
                  className="border w-16"
                  value={r.daily_cap || 0}
                  onChange={(e) => {
                    const updated = [...rules];
                    updated[idx].daily_cap = e.target.value;
                    setRules(updated);
                  }}/></td>

                <td><input type="number"
                  className="border w-16"
                  value={r.hourly_cap || 0}
                  onChange={(e) => {
                    const updated = [...rules];
                    updated[idx].hourly_cap = e.target.value;
                    setRules(updated);
                  }}/></td>

                <td><input type="text"
                  className="border w-48"
                  value={r.redirect_url}
                  onChange={(e) => {
                    const updated = [...rules];
                    updated[idx].redirect_url = e.target.value;
                    setRules(updated);
                  }}/></td>

                <td>
                  <button className="bg-green-500 text-white px-2 py-1 rounded"
                    onClick={() => updateRule(r)}>
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Remaining caps */}
      {remaining.length > 0 && (
        <div className="mt-3 text-sm p-3 border rounded bg-gray-50">
          <strong>Remaining (Daily / Hourly):</strong>
          <pre>{JSON.stringify(remaining, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
