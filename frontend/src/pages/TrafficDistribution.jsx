// frontend/src/pages/TrafficDistribution.jsx
import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient";

export default function TrafficDistribution() {
  /* --------------------------
      STATE
  -------------------------- */
  const [pubCode, setPubCode] = useState("");
  const [meta, setMeta] = useState([]);
  const [publisher, setPublisher] = useState(null);
  const [rules, setRules] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState([]);

  /* --------------------------
      LOAD META (TRACKING LINKS)
  -------------------------- */
  const loadMeta = async () => {
    if (!pubCode) return;
    try {
      const res = await apiClient.get(`/distribution/meta?pub_id=${pubCode}`);
      setMeta(res.data);
      setPublisher(res.data?.[0] || null);
    } catch (err) {
      console.error("META ERR:", err);
    }
  };

  /* --------------------------
      LOAD RULES
  -------------------------- */
  const loadRules = async () => {
    if (!pubCode) return;
    try {
      const res = await apiClient.get(`/distribution/rules?pub_id=${pubCode}`);
      setRules(res.data);
    } catch (err) {
      console.error("RULES ERR:", err);
    }
  };

  /* --------------------------
      LOAD OFFERS (EXCLUDE Already Used)
  -------------------------- */
  const loadOffers = async () => {
    try {
      const exclude = rules.map((r) => r.offer_id).join(",");
      const res = await apiClient.get(`/distribution/offers?exclude=${exclude}`);
      setOffers(res.data);
    } catch (err) {
      console.error("OFFERS ERR:", err);
    }
  };

  /* --------------------------
      REMAINING CAPS
  -------------------------- */
  const loadRemaining = async () => {
    if (!pubCode) return;
    try {
      const res = await apiClient.get(
        `/distribution/rules/remaining?pub_id=${pubCode}`
      );
      setRemaining(res.data);
    } catch (err) {
      console.error("REMAINING ERR:", err);
    }
  };

  /* --------------------------
      LOAD ALL WHEN PUB ENTERED
  -------------------------- */
  useEffect(() => {
    if (!pubCode) return;
    loadMeta();
    loadRules();
    loadRemaining();
  }, [pubCode]);

  useEffect(() => {
    loadOffers();
  }, [rules]);

  /* --------------------------
      HANDLERS
  -------------------------- */
  const updateRule = async (id, field, value) => {
    try {
      const payload = {
        ...rules.find((r) => r.id === id),
        [field]: value,
      };

      await apiClient.put(`/distribution/rules/${id}`, payload);
      loadRules();
      loadRemaining();
    } catch (err) {
      console.error("UPDATE ERR:", err);
    }
  };

  const deleteRule = async (id) => {
    if (!window.confirm("Delete rule?")) return;
    try {
      await apiClient.delete(`/distribution/rules/${id}`);
      loadRules();
      loadRemaining();
    } catch (err) {
      console.error("DELETE ERR:", err);
    }
  };

  /* --------------------------
      ADD RULE
  -------------------------- */
  const addRule = async () => {
    if (!publisher) return alert("Select publisher!");

    const offer = offers[0];
    if (!offer) return alert("No offers available");

    try {
      const payload = {
        pub_id: pubCode,
        publisher_id: publisher.publisher_id,
        publisher_name: publisher.publisher_name,
        tracking_link_id: publisher.tracking_link_id,
        geo: publisher.geo || "",
        carrier: publisher.carrier || "",
        offer_id: offer.offer_id,
        offer_code: offer.offer_id, // not used but required
        offer_name: offer.offer_name,
        advertiser_name: offer.advertiser_name,
        redirect_url: offer.tracking_url,
        type: offer.type,
        weight: 10,
        created_by: 1,
      };

      await apiClient.post(`/distribution/rules`, payload);
      loadRules();
      loadRemaining();
    } catch (err) {
      console.error("ADD RULE ERR:", err);
    }
  };

  /* --------------------------
      UI RENDER
  -------------------------- */
  return (
    <div className="p-5">
      <h2 className="text-xl font-bold mb-3">Traffic Distribution</h2>

      {/* PUB INPUT */}
      <div>
        <input
          value={pubCode}
          onChange={(e) => setPubCode(e.target.value.toUpperCase())}
          placeholder="PUB01"
          className="border p-2"
        />
        <button
          onClick={() => {
            loadMeta();
            loadRules();
            loadRemaining();
          }}
          className="ml-2 bg-blue-600 text-white px-4 py-2 rounded"
        >
          Load
        </button>
      </div>

      {/* TRACKING LINK INFO */}
      {publisher && (
        <div className="mt-4 p-3 border rounded bg-gray-50">
          <b>Publisher:</b> {publisher.publisher_name} <br />
          <b>Geo:</b> {publisher.geo} <br />
          <b>Carrier:</b> {publisher.carrier}
        </div>
      )}

      {/* RULES TABLE */}
      <div className="mt-5">
        <h3 className="font-bold mb-2">Rules</h3>
        <button
          onClick={addRule}
          className="mb-2 bg-green-600 text-white px-4 py-2 rounded"
        >
          + Add Rule
        </button>

        <table className="w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th>ID</th>
              <th>Offer</th>
              <th>Weight</th>
              <th>Geo</th>
              <th>Carrier</th>
              <th>Daily Cap</th>
              <th>Hour Cap</th>
              <th>Redirect</th>
              <th>Delete</th>
            </tr>
          </thead>

          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border">
                <td>{r.id}</td>
                <td>{r.offer_name}</td>

                <td>
                  <input
                    value={r.weight}
                    onChange={(e) =>
                      updateRule(r.id, "weight", Number(e.target.value))
                    }
                    className="border p-1 w-20"
                    type="number"
                  />
                </td>

                <td>
                  <input
                    value={r.geo}
                    onChange={(e) => updateRule(r.id, "geo", e.target.value)}
                    className="border p-1 w-28"
                  />
                </td>

                <td>
                  <input
                    value={r.carrier}
                    onChange={(e) => updateRule(r.id, "carrier", e.target.value)}
                    className="border p-1 w-28"
                  />
                </td>

                <td>
                  <input
                    type="number"
                    value={r.daily_cap || 0}
                    onChange={(e) =>
                      updateRule(r.id, "daily_cap", Number(e.target.value))
                    }
                    className="border p-1 w-20"
                  />
                </td>

                <td>
                  <input
                    type="number"
                    value={r.hourly_cap || 0}
                    onChange={(e) =>
                      updateRule(r.id, "hourly_cap", Number(e.target.value))
                    }
                    className="border p-1 w-20"
                  />
                </td>

                <td>
                  <input
                    value={r.redirect_url || ""}
                    onChange={(e) =>
                      updateRule(r.id, "redirect_url", e.target.value)
                    }
                    className="border p-1 w-60"
                  />
                </td>

                <td>
                  <button
                    onClick={() => deleteRule(r.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded"
                  >
                    X
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* REMAINING INFO */}
        <div className="mt-4 p-3 border bg-gray-50">
          <b>Remaining (Daily / Hourly):</b>
          <pre>{JSON.stringify(remaining, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
