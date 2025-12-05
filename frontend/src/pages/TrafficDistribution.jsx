import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

// FIXED IMPORT PATHS (NO "@/")
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Modal } from "../components/ui/modal";

export default function TrafficDistribution() {
  const [publisherId, setPublisherId] = useState("");      // MUST be numeric
  const [trackingLinks, setTrackingLinks] = useState([]);
  const [rules, setRules] = useState([]);
  const [offers, setOffers] = useState([]);
  const [selectedLink, setSelectedLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState({
    offer_id: "",
    geo: "ALL",
    carrier: "ALL",
    device: "ALL",
    priority: 1,
    weight: 100,
    is_fallback: false,
  });

  // --------------------------------------
  // FETCH TRACKING LINKS (publisherTracking.js)
  // --------------------------------------
  const fetchTrackingLinks = async () => {
    if (!publisherId || isNaN(Number(publisherId))) {
      alert("Publisher ID must be numeric (DB primary key)");
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.get(`/tracking?publisher_id=${Number(publisherId)}`);
      setTrackingLinks(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // --------------------------------------
  // FETCH RULES
  // --------------------------------------
  const fetchRules = async (pubCode, linkId) => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/distribution/rules/${pubCode}/${linkId}`);
      setRules(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // --------------------------------------
  // FETCH REMAINING OFFERS
  // --------------------------------------
  const fetchRemainingOffers = async (pubCode, linkId) => {
    try {
      const res = await apiClient.get(
        `/offers/remaining?pub_id=${pubCode}&tracking_link_id=${linkId}`
      );
      setOffers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // --------------------------------------
  // ADD RULE SUBMIT
  // --------------------------------------
  const handleSubmit = async () => {
    try {
      await apiClient.post(`/distribution/rules`, {
        pub_id: selectedLink.pub_code,          // backend expects pub_code here
        tracking_link_id: selectedLink.id,
        ...form,
      });

      setModalOpen(false);
      fetchRules(selectedLink.pub_code, selectedLink.id);
      fetchRemainingOffers(selectedLink.pub_code, selectedLink.id);

    } catch (err) {
      console.error(err);
    }
  };

  // --------------------------------------
  // SELECT LINK
  // --------------------------------------
  const handleSelectLink = (link) => {
    setSelectedLink(link);
    fetchRules(link.pub_code, link.id);
    fetchRemainingOffers(link.pub_code, link.id);
  };

  useEffect(() => {
    if (publisherId) fetchTrackingLinks();
  }, [publisherId]);

  // --------------------------------------
  // UI START
  // --------------------------------------
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Traffic Distribution</h1>

      {/* Publisher Input */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="number"
          placeholder="Publisher ID (Numeric Only)"
          className="border rounded p-2"
          value={publisherId}
          onChange={(e) => setPublisherId(e.target.value)}
        />
        <Button onClick={fetchTrackingLinks}>Load Links</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">

        {/* TRACKING LINKS */}
        <Card>
          <CardContent className="p-3">
            <h2 className="font-semibold mb-2">Tracking Links</h2>

            {trackingLinks.map((link) => (
              <div
                key={link.id}
                className={`p-2 rounded cursor-pointer border mb-2 ${
                  selectedLink?.id === link.id ? "bg-blue-100" : ""
                }`}
                onClick={() => handleSelectLink(link)}
              >
                {link.name} ({link.pub_code})
              </div>
            ))}
          </CardContent>
        </Card>

        {/* RULES */}
        <Card className="col-span-2">
          <CardContent className="p-3">
            <div className="flex justify-between mb-3">
              <h2 className="font-semibold">Rules</h2>
              {selectedLink && <Button onClick={() => setModalOpen(true)}>+ Add Rule</Button>}
            </div>

            {selectedLink ? (
              <table className="w-full border">
                <thead>
                  <tr className="bg-gray-200">
                    <th>Offer</th>
                    <th>Geo</th>
                    <th>Carrier</th>
                    <th>Device</th>
                    <th>Priority</th>
                    <th>Weight</th>
                    <th>Fallback</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="p-2">{r.offer_id}</td>
                      <td className="p-2">{r.geo}</td>
                      <td className="p-2">{r.carrier}</td>
                      <td className="p-2">{r.device}</td>
                      <td className="p-2">{r.priority}</td>
                      <td className="p-2">{r.weight}</td>
                      <td className="p-2">{r.is_fallback ? "YES" : "NO"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>Select a tracking link to view rules</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ADD RULE MODAL */}
      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)}>
          <div className="p-4 space-y-3">
            <h2 className="text-xl font-bold">Add Rule</h2>

            {/* Offer Dropdown */}
            <select
              className="border p-2 rounded w-full"
              value={form.offer_id}
              onChange={(e) => setForm({ ...form, offer_id: e.target.value })}
            >
              <option value="">Select Offer</option>
              {offers.map((o) => (
                <option key={o.offer_id} value={o.offer_id}>
                  {o.offer_id} - {o.name}
                </option>
              ))}
            </select>

            {/* GEO / CARRIER / DEVICE */}
            <div className="grid grid-cols-3 gap-2">
              <input
                placeholder="Geo"
                className="border p-2 rounded"
                value={form.geo}
                onChange={(e) => setForm({ ...form, geo: e.target.value })}
              />
              <input
                placeholder="Carrier"
                className="border p-2 rounded"
                value={form.carrier}
                onChange={(e) => setForm({ ...form, carrier: e.target.value })}
              />
              <input
                placeholder="Device"
                className="border p-2 rounded"
                value={form.device}
                onChange={(e) => setForm({ ...form, device: e.target.value })}
              />
            </div>

            {/* PRIORITY / WEIGHT */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Priority"
                className="border p-2 rounded"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              />
              <input
                type="number"
                placeholder="Weight"
                className="border p-2 rounded"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })}
              />
            </div>

            {/* FALLBACK CHECKBOX */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_fallback}
                onChange={(e) => setForm({ ...form, is_fallback: e.target.checked })}
              />
              Fallback Rule
            </label>

            <Button className="w-full" onClick={handleSubmit}>
              Save Rule
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
