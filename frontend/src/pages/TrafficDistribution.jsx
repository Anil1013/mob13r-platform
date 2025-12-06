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
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState({
    offer_id: "",
    geo: "ALL",
    carrier: "ALL",
    device: "ALL",
    priority: 1,
    weight: 100,
    fallback: false,
  });

  /* ------------------------------------------------------
     LOAD TRACKING LINKS
  ------------------------------------------------------ */
  const fetchTrackingLinks = async () => {
    if (!publisherId) return;

    try {
      const res = await apiClient.get(`/tracking?publisher_id=${publisherId}`);
      setTrackingLinks(res.data);
    } catch (err) {
      console.error("Fetch tracking links error:", err);
    }
  };

  /* ------------------------------------------------------
     LOAD RULES
  ------------------------------------------------------ */
  const fetchRules = async (pub, id) => {
    try {
      const res = await apiClient.get(`/distribution/rules/${pub}/${id}`);
      setRules(res.data);
    } catch (err) {
      console.error("Fetch rules error:", err);
    }
  };

  /* ------------------------------------------------------
     LOAD OFFERS NOT USED IN THIS LINK
  ------------------------------------------------------ */
  const fetchRemainingOffers = async (pub, id) => {
    try {
      const res = await apiClient.get(
        `/offers/remaining?pub_id=${pub}&tracking_link_id=${id}`
      );
      setOffers(res.data);
    } catch (err) {
      console.error("Fetch remaining offers error:", err);
    }
  };

  /* ------------------------------------------------------
     SELECT A LINK
  ------------------------------------------------------ */
  const handleSelectLink = (link) => {
    setSelectedLink(link);
    fetchRules(link.pub_code, link.id);
    fetchRemainingOffers(link.pub_code, link.id);
  };

  /* ------------------------------------------------------
     OPEN ADD RULE MODAL
  ------------------------------------------------------ */
  const openAddRule = () => {
    setForm({
      offer_id: "",
      geo: "ALL",
      carrier: "ALL",
      device: "ALL",
      priority: 1,
      weight: 100,
      fallback: false,
    });
    setModalOpen(true);
  };

  /* ------------------------------------------------------
     SUBMIT RULE
  ------------------------------------------------------ */
  const handleSubmit = async () => {
    try {
      await apiClient.post(`/distribution/rules`, {
        pub_code: selectedLink.pub_code,
        tracking_link_id: selectedLink.id,
        ...form,
      });

      setModalOpen(false);
      fetchRules(selectedLink.pub_code, selectedLink.id);
      fetchRemainingOffers(selectedLink.pub_code, selectedLink.id);
    } catch (err) {
      console.error("Create rule error:", err);
    }
  };

  useEffect(() => {
    if (publisherId.trim() !== "") fetchTrackingLinks();
  }, [publisherId]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Traffic Distribution</h1>

      {/* ---------------------------------- */}
      {/* SEARCH PUBLISHER (PUB03 / PUB04) */}
      {/* ---------------------------------- */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Enter Publisher ID (PUB03)"
          className="border rounded p-2"
          value={publisherId}
          onChange={(e) => setPublisherId(e.target.value)}
        />
        <Button onClick={fetchTrackingLinks}>Load Links</Button>
      </div>

      {/* ---------------------------------- */}
      {/* GRID LAYOUT */}
      {/* ---------------------------------- */}
      <div className="grid grid-cols-3 gap-4">
        {/* LEFT COLUMN: TRACKING LINKS */}
        <Card>
          <CardContent className="p-3">
            <h2 className="font-semibold mb-2">Tracking Links</h2>

            {trackingLinks.length === 0 && (
              <p className="text-sm text-gray-500">No links found.</p>
            )}

            {trackingLinks.map((link) => (
              <div
                key={link.id}
                className={`p-2 rounded cursor-pointer border mb-2 ${
                  selectedLink?.id === link.id ? "bg-blue-100" : ""
                }`}
                onClick={() => handleSelectLink(link)}
              >
                <div className="font-medium">{link.name}</div>
                <div className="text-xs text-gray-600">
                  {link.pub_code} • {link.geo} • {link.carrier}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* RIGHT SECTION: RULES TABLE */}
        <Card className="col-span-2">
          <CardContent className="p-3">
            <div className="flex justify-between mb-3">
              <h2 className="font-semibold">Rules</h2>

              {selectedLink && (
                <Button onClick={openAddRule}>+ Add Rule</Button>
              )}
            </div>

            {!selectedLink && <p>Select a tracking link to view rules</p>}

            {selectedLink && (
              <table className="w-full border">
                <thead>
                  <tr className="bg-gray-200 text-sm">
                    <th className="p-2">Offer</th>
                    <th className="p-2">Geo</th>
                    <th className="p-2">Carrier</th>
                    <th className="p-2">Device</th>
                    <th className="p-2">Priority</th>
                    <th className="p-2">Weight</th>
                    <th className="p-2">Fallback</th>
                  </tr>
                </thead>

                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id} className="border-b text-sm">
                      <td className="p-2">{r.offer_id}</td>
                      <td className="p-2">{r.geo}</td>
                      <td className="p-2">{r.carrier}</td>
                      <td className="p-2">{r.device}</td>
                      <td className="p-2">{r.priority}</td>
                      <td className="p-2">{r.weight}</td>
                      <td className="p-2">{r.fallback ? "YES" : "NO"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---------------------------------- */}
      {/* ADD RULE MODAL */}
      {/* ---------------------------------- */}
      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)}>
          <div className="p-4 space-y-3">
            <h2 className="text-lg font-bold">Add Rule</h2>

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

            <div className="grid grid-cols-3 gap-2">
              <input
                className="border p-2 rounded"
                placeholder="Geo"
                value={form.geo}
                onChange={(e) => setForm({ ...form, geo: e.target.value })}
              />
              <input
                className="border p-2 rounded"
                placeholder="Carrier"
                value={form.carrier}
                onChange={(e) => setForm({ ...form, carrier: e.target.value })}
              />
              <input
                className="border p-2 rounded"
                placeholder="Device"
                value={form.device}
                onChange={(e) => setForm({ ...form, device: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                className="border p-2 rounded"
                placeholder="Priority"
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: Number(e.target.value) })
                }
              />
              <input
                type="number"
                className="border p-2 rounded"
                placeholder="Weight"
                value={form.weight}
                onChange={(e) =>
                  setForm({ ...form, weight: Number(e.target.value) })
                }
              />
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.fallback}
                onChange={(e) =>
                  setForm({ ...form, fallback: e.target.checked })
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
