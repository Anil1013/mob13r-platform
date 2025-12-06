import React, { useState, useEffect } from "react";
import apiClient from "../api/apiClient";

export default function TrafficDistribution() {
  const [pubCode, setPubCode] = useState("");
  const [links, setLinks] = useState([]);
  const [rules, setRules] = useState([]);
  const [offers, setOffers] = useState([]);
  const [selectedLink, setSelectedLink] = useState(null);

  // UI States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // For add/edit form
  const emptyForm = {
    offer_id: "",
    geo: "ALL",
    carrier: "ALL",
    device: "ALL",
    priority: 1,
    weight: 100,
    is_fallback: false,
  };
  const [form, setForm] = useState(emptyForm);

  const [ruleToEdit, setRuleToEdit] = useState(null);
  const [ruleToDelete, setRuleToDelete] = useState(null);

  /* --------------------------------------------
     FETCH OFFERS (Dropdown options)
  ------------------------------------------------ */
  const loadOffers = async () => {
    try {
      const res = await apiClient.get("/offers");
      setOffers(res.data);
    } catch (err) {
      console.error("Error loading offers:", err);
    }
  };

  /* --------------------------------------------
     LOAD TRACKING LINKS
  ------------------------------------------------ */
  const loadLinks = async () => {
    if (!pubCode) return alert("Enter PUB Code");

    try {
      const res = await apiClient.get(`/distribution/tracking-links?pub_code=${pubCode}`);
      setLinks(res.data);
      setRules([]);
      setSelectedLink(null);
    } catch (err) {
      console.error("Fetch tracking links error:", err);
    }
  };

  /* --------------------------------------------
     LOAD RULES
  ------------------------------------------------ */
  const loadRules = async (link) => {
    setSelectedLink(link);

    try {
      const res = await apiClient.get(`/distribution/rules?tracking_link_id=${link.id}`);
      setRules(res.data);
    } catch (err) {
      console.error("Fetch rules error:", err);
    }
  };

  /* --------------------------------------------
     HANDLE ADD RULE
  ------------------------------------------------ */
  const handleAddRule = async () => {
    if (!form.offer_id) return alert("Select Offer");

    try {
      await apiClient.post("/distribution/rules", {
        pub_code: selectedLink.pub_code,
        tracking_link_id: selectedLink.id,
        ...form,
      });

      setShowAddModal(false);
      setForm(emptyForm);
      loadRules(selectedLink);
    } catch (err) {
      console.error("Add rule error:", err);
      alert("Error adding rule");
    }
  };

  /* --------------------------------------------
     HANDLE EDIT RULE
  ------------------------------------------------ */
  const handleEditRule = async () => {
    try {
      await apiClient.put(`/distribution/rules/${ruleToEdit.id}`, {
        pub_code: selectedLink.pub_code,
        tracking_link_id: selectedLink.id,
        ...form,
      });

      setShowEditModal(false);
      loadRules(selectedLink);
    } catch (err) {
      console.error("Edit rule error:", err);
      alert("Error updating rule");
    }
  };

  /* --------------------------------------------
     HANDLE DELETE RULE
  ------------------------------------------------ */
  const handleDeleteRule = async () => {
    try {
      await apiClient.delete(`/distribution/rules/${ruleToDelete.id}`);

      setShowDeleteModal(false);
      loadRules(selectedLink);
    } catch (err) {
      console.error("delete rule error:", err);
    }
  };

  /* --------------------------------------------
     COPY TRACKING URL
  ------------------------------------------------ */
  const copyLink = (url) => {
    navigator.clipboard.writeText(url);
    alert("Copied!");
  };

  /* --------------------------------------------
     Load offers only once
  ------------------------------------------------ */
  useEffect(() => {
    loadOffers();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Traffic Distribution</h1>

      {/* PUB Code Search */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="PUB03"
          className="border rounded p-2"
          value={pubCode}
          onChange={(e) => setPubCode(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={loadLinks}
        >
          Load Links
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Tracking Links Section */}
        <div className="border rounded p-4">
          <h3 className="font-semibold mb-3">Tracking Links</h3>

          {links.length === 0 && <p>No tracking links</p>}

          {links.map((link) => (
            <div
              key={link.id}
              className={`p-2 border rounded cursor-pointer mb-2 ${
                selectedLink?.id === link.id ? "bg-blue-200" : ""
              }`}
              onClick={() => loadRules(link)}
            >
              <div className="flex justify-between">
                <span>{link.name}</span>
                <button
                  className="text-xs text-blue-600 underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyLink(link.tracking_url);
                  }}
                >
                  Copy URL
                </button>
              </div>
              <div className="text-xs opacity-60">{link.tracking_url}</div>
            </div>
          ))}
        </div>

        {/* Rules Section */}
        <div className="border rounded p-4">
          <div className="flex justify-between mb-3">
            <h3 className="font-semibold">Rules</h3>

            {selectedLink && (
              <button
                className="bg-green-600 text-white px-3 py-1 rounded"
                onClick={() => {
                  setForm(emptyForm);
                  setShowAddModal(true);
                }}
              >
                + Add Rule
              </button>
            )}
          </div>

          {rules.length === 0 && <p>Select a link to view rules</p>}

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th>Offer</th>
                <th>Geo</th>
                <th>Carrier</th>
                <th>Device</th>
                <th>Priority</th>
                <th>Weight</th>
                <th>Fallback</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-b">
                  <td>{r.offer_id}</td>
                  <td>{r.geo}</td>
                  <td>{r.carrier}</td>
                  <td>{r.device}</td>
                  <td>{r.priority}</td>
                  <td>{r.weight}</td>
                  <td>{r.is_fallback ? "YES" : "NO"}</td>

                  <td className="flex gap-2">
                    <button
                      className="text-blue-600"
                      onClick={() => {
                        setRuleToEdit(r);
                        setForm(r);
                        setShowEditModal(true);
                      }}
                    >
                      Edit
                    </button>

                    <button
                      className="text-red-600"
                      onClick={() => {
                        setRuleToDelete(r);
                        setShowDeleteModal(true);
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>
      </div>

      {/* ---------------------------------------------
          MODALS 
      ---------------------------------------------- */}

      {/* ADD + EDIT Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-white w-[400px] p-5 rounded shadow-xl">

            <h2 className="text-xl font-semibold mb-4">
              {showAddModal ? "Add Rule" : "Edit Rule"}
            </h2>

            {/* OFFER DROPDOWN */}
            <select
              className="border p-2 rounded w-full mb-3"
              value={form.offer_id}
              onChange={(e) => setForm({ ...form, offer_id: e.target.value })}
            >
              <option value="">Select Offer</option>
              {offers.map((o) => (
                <option key={o.offer_id} value={o.offer_id}>
                  {o.offer_id} — {o.name}
                </option>
              ))}
            </select>

            {/* GEO, Carrier, Device */}
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

            {/* Priority + Weight */}
            <div className="grid grid-cols-2 gap-2 mt-2">
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
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={form.is_fallback}
                onChange={(e) =>
                  setForm({ ...form, is_fallback: e.target.checked })
                }
              />
              Fallback Rule
            </label>

            {/* Buttons */}
            <div className="flex justify-end gap-3 mt-4">
              <button
                className="px-4 py-2 bg-gray-300 rounded"
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
              >
                Cancel
              </button>

              <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={() => {
                  showAddModal ? handleAddRule() : handleEditRule();
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-white p-5 rounded w-[350px] shadow-xl">
            <h2 className="text-lg font-semibold mb-3">Confirm Delete</h2>
            <p>Are you sure you want to delete this rule?</p>

            <div className="flex justify-end gap-3 mt-4">
              <button
                className="px-4 py-2 bg-gray-300 rounded"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>

              <button
                className="px-4 py-2 bg-red-600 text-white rounded"
                onClick={handleDeleteRule}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
