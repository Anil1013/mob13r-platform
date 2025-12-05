// frontend/src/pages/TrafficDistribution.jsx

import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

// FIXED IMPORT PATHS (NO "@/")
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Modal } from "../components/ui/modal";

export default function TrafficDistribution() {
  // yahan hum PUB03 / PUB04 type value rakh rahe hain
  const [publisherCode, setPublisherCode] = useState("");
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

  /* -------------------------------------------------
   * 1) TRACKING LINKS – use pub_code (PUB03, PUB04)
   * ------------------------------------------------- */
  const fetchTrackingLinks = async () => {
    if (!publisherCode) return;
    setLoading(true);
    try {
      // IMPORTANT: yahan /tracking?publisher_id=... nahi
      const res = await apiClient.get(
        `/distribution/tracking-links?pub_id=${publisherCode}`
      );
      setTrackingLinks(res.data || []);
    } catch (err) {
      console.error("Error fetching tracking links:", err);
      setTrackingLinks([]);
    }
    setLoading(false);
  };

  /* -------------------------------------------------
   * 2) RULES for selected link
   * ------------------------------------------------- */
  const fetchRules = async (pubCode, linkId) => {
    if (!pubCode || !linkId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(
        `/distribution/rules/${pubCode}/${linkId}`
      );
      setRules(res.data || []);
    } catch (err) {
      console.error("Error fetching rules:", err);
      setRules([]);
    }
    setLoading(false);
  };

  /* -------------------------------------------------
   * 3) REMAINING OFFERS for selected link
   * ------------------------------------------------- */
  const fetchRemainingOffers = async (pubCode, linkId) => {
    if (!pubCode || !linkId) return;
    try {
      const res = await apiClient.get(
        `/offers/remaining?pub_id=${pubCode}&tracking_link_id=${linkId}`
      );
      setOffers(res.data || []);
    } catch (err) {
      console.error("Error fetching remaining offers:", err);
      setOffers([]);
    }
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
    if (!selectedLink) return;
    try {
      await apiClient.post(`/distribution/rules`, {
        pub_id: selectedLink.pub_code, // string: PUB03
        tracking_link_id: selectedLink.id, // integer
        ...form,
      });

      setModalOpen(false);
      // refresh data
      fetchRules(selectedLink.pub_code, selectedLink.id);
      fetchRemainingOffers(selectedLink.pub_code, selectedLink.id);
    } catch (err) {
      console.error("Error saving rule:", err);
    }
  };

  const handleSelectLink = (link) => {
    setSelectedLink(link);
    fetchRules(link.pub_code, link.id);
    fetchRemainingOffers(link.pub_code, link.id);
  };

  // OPTIONAL: agar enter press karte hi load karwana ho
  useEffect(() => {
    // yadi tum nahi chahte auto-load, isko hata sakte ho
    // abhi safe rehne ke liye disabled rakha hai
    // if (publisherCode) fetchTrackingLinks();
  }, [publisherCode]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Traffic Distribution</h1>

      {/* Publisher Code Input (PUB03 / PUB04) */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Publisher Code (e.g. PUB03)"
          className="border rounded p-2"
          value={publisherCode}
          onChange={(e) => setPublisherCode(e.target.value.trim())}
        />
        <Button onClick={fetchTrackingLinks} disabled={!publisherCode || loading}>
          {loading ? "Loading..." : "Load Links"}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* LEFT: Tracking Links List */}
        <Card>
          <CardContent className="p-3">
            <h2 className="font-semibold mb-2">Tracking Links</h2>

            {loading && !selectedLink && (
              <p className="text-sm text-gray-500">Loading links...</p>
            )}

            {!loading && trackingLinks.length === 0 && publisherCode && (
              <p className="text-sm text-red-500">
                No tracking links found for {publisherCode}
              </p>
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
                <div className="text-xs text-gray-500">
                  {link.pub_code} · {link.geo} · {link.carrier}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* RIGHT: Rules Table */}
        <Card className="col-span-2">
          <CardContent className="p-3">
            <div className="flex justify-between mb-3">
              <h2 className="font-semibold">Rules</h2>
              {selectedLink && (
                <Button onClick={openAddRule}>+ Add Rule</Button>
              )}
            </div>

            {selectedLink ? (
              rules.length > 0 ? (
                <table className="w-full border text-sm">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="p-2 text-left">Offer</th>
                      <th className="p-2 text-left">Geo</th>
                      <th className="p-2 text-left">Carrier</th>
                      <th className="p-2 text-left">Device</th>
                      <th className="p-2 text-left">Priority</th>
                      <th className="p-2 text-left">Weight</th>
                      <th className="p-2 text-left">Fallback</th>
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
                        <td className="p-2">
                          {r.is_fallback ? "YES" : "NO"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-500">
                  No rules yet. Click &quot;Add Rule&quot; to create one.
                </p>
              )
            ) : (
              <p>Select a tracking link to view rules</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Rule Modal */}
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

            {/* Geo / Carrier / Device */}
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
                onChange={(e) =>
                  setForm({ ...form, carrier: e.target.value })
                }
              />
              <input
                placeholder="Device"
                className="border p-2 rounded"
                value={form.device}
                onChange={(e) => setForm({ ...form, device: e.target.value })}
              />
            </div>

            {/* Priority / Weight */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Priority"
                className="border p-2 rounded"
                value={form.priority}
                onChange={(e) =>
                  setForm({
                    ...form,
                    priority: Number(e.target.value),
                  })
                }
              />
              <input
                type="number"
                placeholder="Weight"
                className="border p-2 rounded"
                value={form.weight}
                onChange={(e) =>
                  setForm({
                    ...form,
                    weight: Number(e.target.value),
                  })
                }
              />
            </div>

            {/* Fallback */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_fallback}
                onChange={(e) =>
                  setForm({
                    ...form,
                    is_fallback: e.target.checked,
                  })
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
