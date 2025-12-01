import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";
import RuleModal from "../components/RuleModal";

export default function TrafficDistribution() {
  const [pubId, setPubId] = useState("");
  const [trackingLinks, setTrackingLinks] = useState([]);
  const [selectedLink, setSelectedLink] = useState(null);

  const [meta, setMeta] = useState(null);
  const [rules, setRules] = useState([]);
  const [remaining, setRemaining] = useState(0);
  const [offers, setOffers] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editRule, setEditRule] = useState(null);

  /* ---------------------------------------------------
      LOAD TRACKING LINKS FOR THIS PUB CODE
  --------------------------------------------------- */
  const loadTrackingLinks = async () => {
    if (!pubId.trim()) return alert("Enter PUB ID like PUB02");

    const r = await apiClient.get(`/distribution/tracking-links?pub_id=${pubId}`);
    if (r.data.success) {
      setTrackingLinks(r.data.links);
    } else {
      alert("Invalid Publisher");
    }
  };

  /* ---------------------------------------------------
      WHEN LINK SELECTED → LOAD META / RULES / OFFERS
  --------------------------------------------------- */
  const selectLink = async (link) => {
    setSelectedLink(link);

    // Load meta
    const m = await apiClient.get(
      `/distribution/meta?pub_id=${link.pub_code}&tracking_link_id=${link.tracking_link_id}`
    );
    if (m.data.success) setMeta(m.data.meta);

    // Load rules
    const rs = await apiClient.get(
      `/distribution/rules?pub_id=${link.pub_code}&tracking_link_id=${link.tracking_link_id}`
    );
    if (rs.data.success) setRules(rs.data.rules);

    // Remaining %
    const rm = await apiClient.get(
      `/distribution/rules/remaining?pub_id=${link.pub_code}&tracking_link_id=${link.tracking_link_id}`
    );
    if (rm.data.success) setRemaining(rm.data.remaining);

    // Load ONLY offers of the same GEO + Carrier
    loadFilteredOffers(link.geo, link.carrier);
  };

  /* ---------------------------------------------------
      LOAD OFFERS based on GEO + CARRIER
  --------------------------------------------------- */
  const loadFilteredOffers = async (geo, carrier) => {
    const r = await apiClient.get("/offers/list"); // your existing endpoint
    if (r.data.success) {
      const all = r.data.offers;

      // filter by GEO + carrier + active status
      const filtered = all.filter(
        (o) =>
          o.status === "active" &&
          (o.geo.toUpperCase() === geo.toUpperCase() || o.geo === "ALL") &&
          (o.carrier.toUpperCase() === carrier.toUpperCase() || o.carrier === "ALL")
      );

      setOffers(filtered);
    }
  };

  /* ---------------------------------------------------
      DELETE RULE
  --------------------------------------------------- */
  const deleteRule = async (id) => {
    if (!window.confirm("Delete rule?")) return;

    await apiClient.delete(`/distribution/rules/${id}`);

    // reload rules
    selectLink(selectedLink);
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Traffic Distribution</h2>

      {/* PUB INPUT */}
      <div className="flex gap-3 items-center">
        <input
          className="border p-2"
          placeholder="Enter PUB02 / PUB03"
          value={pubId}
          onChange={(e) => setPubId(e.target.value)}
        />

        <button className="bg-blue-600 text-white px-4 py-2" onClick={loadTrackingLinks}>
          Load
        </button>
      </div>

      {/* TRACKING LINKS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {trackingLinks.map((t) => (
          <div
            key={t.tracking_link_id}
            className={`p-3 border rounded cursor-pointer ${
              selectedLink?.tracking_link_id === t.tracking_link_id
                ? "bg-blue-100"
                : ""
            }`}
            onClick={() => selectLink(t)}
          >
            <p className="font-bold">{t.tracking_id}</p>
            <p className="text-sm text-gray-600">{t.tracking_url}</p>
            <p className="text-xs">
              {t.geo} • {t.carrier}
            </p>
          </div>
        ))}
      </div>

      {/* OVERVIEW */}
      {meta && (
        <div className="p-4 border rounded bg-gray-50">
          <h3 className="font-bold text-xl mb-2">Overview</h3>
          <p><b>PUB:</b> {meta.pub_code}</p>
          <p><b>GEO:</b> {meta.geo}</p>
          <p><b>Carrier:</b> {meta.carrier}</p>
          <p><b>Tracking URL:</b> {meta.tracking_url}</p>
          <p><b>Remaining %:</b> {remaining}%</p>
        </div>
      )}

      {/* RULES */}
      {selectedLink && (
        <div className="space-y-3">
          <div className="flex justify-between">
            <h3 className="font-bold text-lg">Rules</h3>
            <button
              className="bg-green-600 text-white px-4 py-2"
              onClick={() => {
                setEditRule(null);
                setModalOpen(true);
              }}
            >
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
                  <td className="p-2 border flex gap-2">
                    <button
                      className="bg-yellow-600 text-white px-3 py-1"
                      onClick={() => {
                        setEditRule(r);
                        setModalOpen(true);
                      }}
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

      {/* MODAL FOR ADD/EDIT RULE */}
      {modalOpen && (
        <RuleModal
          rule={editRule}
          pubId={selectedLink.pub_code}
          trackingLinkId={selectedLink.tracking_link_id}
          offers={offers}           // ⭐ filtered offers passed here
          remaining={remaining}
          onSaved={() => selectLink(selectedLink)}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
