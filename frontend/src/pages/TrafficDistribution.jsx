import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Modal } from "../components/ui/modal";

export default function TrafficDistribution() {
  const [publisherId, setPublisherId] = useState("");
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

  // LOAD TRACKING LINKS (publisher_id = integer)
  const fetchTrackingLinks = async () => {
    if (!publisherId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(
        `/tracking?publisher_id=${Number(publisherId)}`
      );
      setTrackingLinks(res.data);
    } catch (err) {
      console.error("Fetch tracking links error:", err);
    }
    setLoading(false);
  };

  // LOAD RULES (pub_code = string, id = int)
  const fetchRules = async (pub_code, link_id) => {
    setLoading(true);
    try {
      const res = await apiClient.get(
        `/distribution/rules/${pub_code}/${link_id}`
      );
      setRules(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // LOAD REMAINING OFFERS
  const fetchRemainingOffers = async (pub_code, link_id) => {
    try {
      const res = await apiClient.get(
        `/offers/remaining?pub_id=${pub_code}&tracking_link_id=${link_id}`
      );
      setOffers(res.data);
    } catch (err) {
      console.error("Error fetching offers:", err);
    }
  };

  const handleSelectLink = (link) => {
    setSelectedLink(link);
    fetchRules(link.pub_code, link.id);
    fetchRemainingOffers(link.pub_code, link.id);
  };

  const openAddRule = () => {
    setForm({
      offer_id: "",
      geo: "ALL",
      carrier: "ALL",
      device: "ALL",
      priority: 1,
      weight: 100,
      is_fallback: false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      await apiClient.post(`/distribution/rules`, {
        pub_id: selectedLink.pub_code,
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

  useEffect(() => {
    if (publisherId) fetchTrackingLinks();
  }, [publisherId]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Traffic Distribution</h1>

      {/* Search Publisher */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="number"
          placeholder="Publisher ID (integer)"
          className="border rounded p-2"
          value={publisherId}
          onChange={(e) => setPublisherId(e.target.value)}
        />
        <Button onClick={fetchTrackingLinks}>Load Links</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* LEFT: TRACKING LINKS */}
        <Card>
          <CardContent className="p-3">
            <h2 className="font-semibold mb-2">Tracking Links</h2>
            {trackingLinks.length === 0 ? (
              <p className="text-red-500">No links found for publisher</p>
            ) : (
              trackingLinks.map((link) => (
                <div
                  key={link.id}
                  className={`p-2 rounded cursor-pointer border mb-2 ${
                    selectedLink?.id === link.id ? "bg-blue-100" : ""
                  }`}
                  onClick={() => handleSelectLink(link)}
                >
                  {link.name} ({link.pub_code})
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* RIGHT: RULES TABLE */}
        <Card className="col-span-2">
          <CardContent className="p-3">
            <div className="flex justify-between mb-3">
              <h2 className="font-semibold">Rules</h2>
              {selectedLink && <Button onClick={openAddRule}>+ Add Rule</Button>}
            </div>

            {!selectedLink ? (
              <p>Select a tracking link to view rules</p>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)}>
          <div className="p-4 space-y-3">
            <h2 className="text-xl font-bold">Add Rule</h2>

            {/* Offer Select */}
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

            {/* Targeting */}
            <div className="grid grid-cols-3 gap-2">
              <input
                placeholder="Geo"
                className="border p-2 rounded"
                value={form.geo}
                onChange={(e) =>
                  setForm({ ...form, geo: e.target.value })
                }
              />
              <input
                placeholder="Carrier"
                className="border p-2 rounded"
                value={form.carrier}
                onChange={(e) =>
                  setForm({ ...form, carrier: e.target.value })
                }
              />
              <input
                placeholder="Device"
                className="border p-2 rounded"
                value={form.device}
                onChange={(e) =>
                  setForm({ ...form, device: e.target.value })
                }
              />
            </div>

            {/* Priority + Weight */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Priority"
                className="border p-2 rounded"
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: Number(e.target.value) })
                }
              />
              <input
                type="number"
                placeholder="Weight"
                className="border p-2 rounded"
                value={form.weight}
                onChange={(e) =>
                  setForm({ ...form, weight: Number(e.target.value) })
                }
              />
            </div>

            {/* Fallback */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_fallback}
                onChange={(e) =>
                  setForm({ ...form, is_fallback: e.target.checked })
                }
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
