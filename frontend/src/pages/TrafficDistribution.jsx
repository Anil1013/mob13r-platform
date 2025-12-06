import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

export default function TrafficDistribution() {
  /* ------------------------------------------
     STATE
  ------------------------------------------ */
  const [pubCode, setPubCode] = useState("");
  const [links, setLinks] = useState([]);
  const [selectedLink, setSelectedLink] = useState(null);

  const [rules, setRules] = useState([]);
  const [offers, setOffers] = useState([]);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editRule, setEditRule] = useState(null);

  const [params, setParams] = useState({
    ip: false,
    ua: false,
    device: false,
    msisdn: false,
    click_id: false,
    sub1: false,
    sub2: false,
    sub3: false,
    sub4: false,
    sub5: false,
  });

  /* ------------------------------------------
     LOAD OFFERS
  ------------------------------------------ */
  const loadOffers = async () => {
    try {
      const res = await apiClient.get(`/distribution/offers`);
      setOffers(res.data.items || []);
    } catch (err) {
      console.error("load offers error:", err);
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  /* ------------------------------------------
     LOAD TRACKING LINKS
  ------------------------------------------ */
  const loadLinks = async () => {
    if (!pubCode) return alert("Enter PUB Code");

    try {
      const res = await apiClient.get(
        `/distribution/tracking-links?pub_code=${pubCode}`
      );

      setLinks(res.data.items || []);
      setSelectedLink(null);
      setRules([]);

      if (res.data.items.length === 1) {
        handleSelectLink(res.data.items[0]);
      }
    } catch (err) {
      console.error("tracking link error:", err);
    }
  };

  /* ------------------------------------------
     SELECT TRACKING LINK
  ------------------------------------------ */
  const handleSelectLink = async (link) => {
    setSelectedLink(link);

    // load params
    if (link.required_params) {
      setParams(link.required_params);
    }

    // load rules
    loadRules(link.id);
  };

  /* ------------------------------------------
     LOAD RULES
  ------------------------------------------ */
  const loadRules = async (id) => {
    try {
      const res = await apiClient.get(
        `/distribution/rules?tracking_link_id=${id}`
      );
      setRules(res.data.items || []);
    } catch (err) {
      console.error("rules load error:", err);
    }
  };

  /* ------------------------------------------
     SAVE PARAMS
  ------------------------------------------ */
  const saveParams = async () => {
    if (!selectedLink) return;

    try {
      await apiClient.put(
        `/distribution/tracking-links/${selectedLink.id}/params`,
        { required_params: params }
      );

      alert("Parameters Saved!");
    } catch (err) {
      console.error("save params error:", err);
    }
  };

  /* ------------------------------------------
     COPY URL
  ------------------------------------------ */
  const copyTrackingUrl = () => {
    if (!selectedLink) return alert("Select a link first");

    let base = selectedLink.tracking_url;

    // attach required params as tokens
    const qp = [];

    Object.keys(params).forEach((key) => {
      if (params[key] === true) qp.push(`${key}={<${key}>}`);
    });

    const finalUrl =
      qp.length > 0 ? `${base}?${qp.join("&")}` : base;

    navigator.clipboard.writeText(finalUrl);
    alert("Copied:\n" + finalUrl);
  };

  /* ------------------------------------------
     ADD / EDIT RULE MODAL OPEN
  ------------------------------------------ */
  const openAddRule = () => {
    setEditRule(null);
    setShowModal(true);
  };

  const openEditRule = (rule) => {
    setEditRule(rule);
    setShowModal(true);
  };

  /* ------------------------------------------
     DELETE RULE
  ------------------------------------------ */
  const deleteRule = async (id) => {
    if (!window.confirm("Delete this rule?")) return;

    try {
      await apiClient.delete(`/distribution/rules/${id}`);
      loadRules(selectedLink.id);
    } catch (err) {
      console.error("delete rule:", err);
    }
  };

  /* ------------------------------------------
     SAVE RULE
  ------------------------------------------ */
  const saveRule = async (e) => {
    e.preventDefault();

    const fd = new FormData(e.target);

    const payload = {
      pub_code: pubCode,
      tracking_link_id: selectedLink.id,
      offer_id: fd.get("offer_id"),
      geo: fd.get("geo"),
      carrier: fd.get("carrier"),
      device: fd.get("device"),
      priority: Number(fd.get("priority")),
      weight: Number(fd.get("weight")),
      is_fallback: fd.get("is_fallback") === "on",
    };

    try {
      if (editRule) {
        await apiClient.put(`/distribution/rules/${editRule.id}`, payload);
      } else {
        await apiClient.post(`/distribution/rules`, payload);
      }

      setShowModal(false);
      loadRules(selectedLink.id);
    } catch (err) {
      console.error("save rule error:", err);
      alert(err.response?.data?.message || "Error");
    }
  };

  /* ------------------------------------------
     FILTERED RULES
  ------------------------------------------ */
  const filteredRules = rules.filter((r) =>
    `${r.offer_id} ${r.offer_name} ${r.geo}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  /* ------------------------------------------
     CALCULATE TOTAL WEIGHT
  ------------------------------------------ */
  const totalWeight = rules.reduce((sum, r) => sum + Number(r.weight), 0);

  /* ------------------------------------------
     UI
  ------------------------------------------ */
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Traffic Distribution</h1>

      {/* Pub Code Input */}
      <div className="flex gap-3 items-center mb-4">
        <input
          type="text"
          placeholder="PUB03"
          value={pubCode}
          onChange={(e) => setPubCode(e.target.value)}
          className="border rounded px-3 py-2"
        />

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={loadLinks}
        >
          Load Links
        </button>

        <button
          className="bg-gray-700 text-white px-4 py-2 rounded"
          onClick={copyTrackingUrl}
        >
          Copy Tracking URL
        </button>

        {selectedLink && (
          <span className="text-sm text-gray-700">
            Publisher: {selectedLink.publisher_name} |
            Link: {selectedLink.name}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* LEFT: Tracking Links */}
        <div className="border rounded p-4">
          <h3 className="font-semibold mb-2">
            Tracking Links ({links.length})
          </h3>

          {links.map((link) => (
            <div
              key={link.id}
              className={`p-3 border rounded mb-2 cursor-pointer ${
                selectedLink?.id === link.id ? "bg-blue-200" : ""
              }`}
              onClick={() => handleSelectLink(link)}
            >
              <div className="font-semibold">
                {link.name} ({link.pub_code})
              </div>
              <div className="text-xs text-gray-600">
                {link.geo} • {link.carrier} • {link.type}
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT: RULES */}
        <div className="border rounded p-4">

          {/* Header */}
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="font-semibold">Rules</h3>
              {selectedLink && (
                <p className="text-sm text-gray-500">
                  {selectedLink.name} ({selectedLink.pub_code})
                </p>
              )}
              <p className="text-sm text-green-600">
                Total Weight: {totalWeight} / 100
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search rules..."
                className="border rounded px-3 py-1"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                className="bg-green-600 text-white px-4 py-2 rounded"
                onClick={openAddRule}
              >
                + Add Rule
              </button>
            </div>
          </div>

          {/* Required Params */}
          <div className="border rounded p-3 mb-4">
            <div className="font-semibold mb-2">
              Default Parameters (required_params)
            </div>

            <div className="grid grid-cols-5 gap-2 text-sm">
              {Object.keys(params).map((key) => (
                <label key={key} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={params[key]}
                    onChange={(e) =>
                      setParams({ ...params, [key]: e.target.checked })
                    }
                  />
                  {key.toUpperCase()}
                </label>
              ))}
            </div>

            <button
              className="mt-3 bg-blue-600 text-white px-3 py-1 rounded"
              onClick={saveParams}
            >
              Save Params
            </button>
          </div>

          {/* RULE TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-100 text-xs">
                  <th>Offer</th>
                  <th>Advertiser</th>
                  <th>Publisher</th>
                  <th>Type</th>
                  <th>Geo</th>
                  <th>Carrier</th>
                  <th>Device</th>
                  <th>Priority</th>
                  <th>Weight</th>
                  <th>Fallback</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredRules.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td>
                      <b>{r.offer_id}</b> <br />
                      <span className="text-xs text-gray-500">
                        {r.offer_name}
                      </span>
                    </td>
                    <td>{r.advertiser_name || "-"}</td>
                    <td>{selectedLink?.publisher_name}</td>
                    <td>{r.offer_type}</td>
                    <td>{r.geo}</td>
                    <td>{r.carrier}</td>
                    <td>{r.device}</td>
                    <td>{r.priority}</td>
                    <td>{r.weight}</td>
                    <td>{r.is_fallback ? "YES" : "NO"}</td>
                    <td className="text-blue-600 cursor-pointer"
                        onClick={() => openEditRule(r)}>Edit</td>
                    <td className="text-red-600 cursor-pointer"
                        onClick={() => deleteRule(r.id)}>Delete</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl">

            <h2 className="text-xl font-semibold mb-4">
              {editRule ? "Edit Rule" : "Add Rule"}
            </h2>

            <form onSubmit={saveRule} className="grid gap-4">

              {/* Offer Dropdown */}
              <div>
                <label>Offer</label>
                <select
                  name="offer_id"
                  required
                  defaultValue={editRule?.offer_id || ""}
                  className="border rounded w-full p-2"
                >
                  <option value="">-- Select Offer --</option>
                  {offers.map((o) => (
                    <option key={o.offer_id} value={o.offer_id}>
                      {o.offer_id} — {o.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Geo, Carrier, Device */}
              <div className="grid grid-cols-3 gap-3">
                <input
                  name="geo"
                  placeholder="Geo"
                  defaultValue={editRule?.geo || "ALL"}
                  className="border rounded p-2"
                />
                <input
                  name="carrier"
                  placeholder="Carrier"
                  defaultValue={editRule?.carrier || "ALL"}
                  className="border rounded p-2"
                />
                <input
                  name="device"
                  placeholder="Device"
                  defaultValue={editRule?.device || "ALL"}
                  className="border rounded p-2"
                />
              </div>

              {/* Priority + Weight */}
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="priority"
                  type="number"
                  placeholder="Priority"
                  defaultValue={editRule?.priority || 1}
                  className="border rounded p-2"
                />
                <input
                  name="weight"
                  type="number"
                  placeholder="Weight"
                  defaultValue={editRule?.weight || 100}
                  className="border rounded p-2"
                />
              </div>

              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  name="is_fallback"
                  defaultChecked={editRule?.is_fallback}
                />
                Fallback Rule
              </label>

              {/* Buttons */}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Save
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
