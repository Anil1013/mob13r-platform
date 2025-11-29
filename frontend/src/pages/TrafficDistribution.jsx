import React, { useState } from "react";
import apiClient from "../api/apiClient";

export default function TrafficDistribution() {
  const [pubCode, setPubCode] = useState("");
  const [meta, setMeta] = useState([]);
  const [rules, setRules] = useState([]);
  const [offers, setOffers] = useState([]);
  const [remaining, setRemaining] = useState([]);

  const loadData = async () => {
    if (!pubCode) {
      alert("Enter Publisher Code");
      return;
    }

    try {
      // 1) META
      const metaRes = await apiClient.get(`/distribution/meta?pub_id=${pubCode}`);
      setMeta(metaRes.data);

      // 2) RULES
      const ruleRes = await apiClient.get(`/distribution/rules?pub_id=${pubCode}`);
      setRules(ruleRes.data);

      // 3) EXCLUDE already added offers
      const exclude = ruleRes.data.map((r) => r.offer_id).filter(Boolean).join(",");

      // 4) OFFERS
      const offersRes = await apiClient.get(
        `/distribution/offers${exclude ? `?exclude=${exclude}` : ""}`
      );
      setOffers(offersRes.data);

      // 5) REMAINING LIMITS
      const remainRes = await apiClient.get(
        `/distribution/rules/remaining?pub_id=${pubCode}`
      );
      setRemaining(remainRes.data);
    } catch (err) {
      console.log("LOAD ERROR:", err);
      alert("Failed loading data. Check console.");
    }
  };

  return (
    <div className="p-4">
      <h2>Traffic Distribution</h2>

      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={pubCode}
          onChange={(e) => setPubCode(e.target.value)}
          placeholder="PUB01"
        />
        <button onClick={loadData}>Load</button>
      </div>

      {/* PUB META */}
      {meta[0] && (
        <div className="mt-3">
          <b>Publisher:</b> {meta[0].publisher_name} <br />
          <b>Geo:</b> {meta[0].geo} <br />
          <b>Carrier:</b> {meta[0].carrier}
        </div>
      )}

      {/* RULES TABLE */}
      <h3 className="mt-4">Rules</h3>
      <table className="table">
        <thead>
          <tr>
            <th>ID</th><th>Offer</th><th>Weight</th><th>Geo</th><th>Carrier</th>
            <th>Daily Cap</th><th>Hour Cap</th><th>Redirect</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.offer_id}</td>
              <td>{r.weight}</td>
              <td>{r.geo}</td>
              <td>{r.carrier}</td>
              <td>{r.daily_cap}</td>
              <td>{r.hourly_cap}</td>
              <td>{r.redirect_url}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* REMAINING */}
      <h3>Remaining (Daily / Hourly)</h3>
      <pre>{JSON.stringify(remaining, null, 2)}</pre>
    </div>
  );
}
