// frontend/src/pages/TrafficDistribution.jsx

import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient";
import { toast } from "react-toastify";
import {
  Plus,
  Copy,
  RefreshCw,
  Search,
  Link as LinkIcon,
  Loader2,
} from "lucide-react";

/* --------------------------------------------------------
   CONSTANTS
-------------------------------------------------------- */

const PARAM_ORDER = [
  "ip",
  "ua",
  "sub1",
  "sub2",
  "sub3",
  "sub4",
  "sub5",
  "device",
  "msisdn",
  "click_id",
];

const PARAM_LABELS = {
  ip: "IP",
  ua: "UA",
  sub1: "SUB1",
  sub2: "SUB2",
  sub3: "SUB3",
  sub4: "SUB4",
  sub5: "SUB5",
  device: "DEVICE",
  msisdn: "MSISDN",
  click_id: "CLICK_ID",
};

const PARAM_PLACEHOLDERS = {
  ip: "{IP}",
  ua: "{UA}",
  sub1: "{SUB1}",
  sub2: "{SUB2}",
  sub3: "{SUB3}",
  sub4: "{SUB4}",
  sub5: "{SUB5}",
  device: "{DEVICE}",
  msisdn: "{MSISDN}",
  click_id: "{CLICK_ID}",
};

/* --------------------------------------------------------
   SMALL UTILS
-------------------------------------------------------- */

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

function buildFinalUrl(baseUrl, requiredParams) {
  if (!baseUrl) return "";

  const activeParams = Object.entries(requiredParams || {})
    .filter(([, v]) => v)
    .map(([key]) => {
      const paramName = key; // param name in URL
      const placeholder = PARAM_PLACEHOLDERS[key] || `{${key.toUpperCase()}}`;
      // NOTE: param name encode karein, placeholder raw rakhen (no %7B %7D)
      return `${encodeURIComponent(paramName)}=${placeholder}`;
    });

  if (!activeParams.length) return baseUrl;

  const hasQuery = baseUrl.includes("?");
  const joiner = hasQuery ? "&" : "?";

  return `${baseUrl}${joiner}${activeParams.join("&")}`;
}

/* --------------------------------------------------------
   MAIN COMPONENT
-------------------------------------------------------- */

export default function TrafficDistribution() {
  const [pubId, setPubId] = useState("PUB03");
  const [search, setSearch] = useState("");
  const [links, setLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(false);

  const [selectedLink, setSelectedLink] = useState(null);
  const [meta, setMeta] = useState(null);

  const [rules, setRules] = useState([]);
  const [remaining, setRemaining] = useState(0);

  const [requiredParams, setRequiredParams] = useState({});
  const [savingParams, setSavingParams] = useState(false);

  const [offers, setOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [savingRule, setSavingRule] = useState(false);

  /* --------------------------------------------------------
     DERIVED
  -------------------------------------------------------- */

  const filteredLinks = useMemo(() => {
    if (!search.trim()) return links;
    const q = search.toLowerCase();
    return links.filter(
      (l) =>
        (l.tracking_id || "").toLowerCase().includes(q) ||
        (l.publisher_name || "").toLowerCase().includes(q) ||
        (l.tracking_url || "").toLowerCase().includes(q)
    );
  }, [links, search]);

  const finalTrackingUrl = useMemo(
    () =>
      buildFinalUrl(
        meta?.tracking_url || selectedLink?.tracking_url || "",
        requiredParams
      ),
    [meta, selectedLink, requiredParams]
  );

  /* --------------------------------------------------------
     LOADERS
  -------------------------------------------------------- */

  const loadTrackingLinks = async () => {
    if (!pubId.trim()) {
      toast.error("Publisher ID required (e.g. PUB03)");
      return;
    }
    setLoadingLinks(true);
    setSelectedLink(null);
    setMeta(null);
    setRules([]);
    setPreview(null);
    try {
      const res = await apiClient.get(
        `/distribution/tracking-links?pub_id=${encodeURIComponent(
          pubId.trim()
        )}`
      );
      if (!res.data?.success) {
        toast.error(res.data?.error || "Failed to load tracking links");
        return;
      }
      setLinks(res.data.links || []);
      if (!res.data.links?.length) {
        toast.info("No tracking links found for this publisher.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error loading tracking links");
    } finally {
      setLoadingLinks(false);
    }
  };

  const loadMeta = async (link) => {
    if (!link) return;
    try {
      const res = await apiClient.get(
        `/distribution/meta?pub_id=${encodeURIComponent(
          pubId.trim()
        )}&tracking_link_id=${link.tracking_link_id}`
      );
      if (res.data?.success) {
        setMeta(res.data.meta);
        setRequiredParams(res.data.meta.required_params || {});
      } else {
        toast.error(res.data?.error || "Meta fetch failed");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error loading overview");
    }
  };

  const loadRules = async (link) => {
    if (!link) return;
    try {
      const res = await apiClient.get(
        `/distribution/rules?pub_id=${encodeURIComponent(
          pubId.trim()
        )}&tracking_link_id=${link.tracking_link_id}`
      );
      if (res.data?.success) {
        setRules(res.data.rules || []);
      } else {
        toast.error(res.data?.error || "Rules fetch failed");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error loading rules");
    }
  };

  const loadRemaining = async (link) => {
    if (!link) return;
    try {
      const res = await apiClient.get(
        `/distribution/rules/remaining?pub_id=${encodeURIComponent(
          pubId.trim()
        )}&tracking_link_id=${link.tracking_link_id}`
      );
      if (res.data?.success) {
        setRemaining(res.data.remaining ?? 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadOffers = async (linkMeta) => {
    if (!linkMeta) return;
    setLoadingOffers(true);
    setOffers([]);
    try {
      // Backend: /distribution/offers -> active offers
      const res = await apiClient.get("/distribution/offers", {
        params: {
          pub_id: pubId.trim(),
          geo: linkMeta.geo,
          carrier: linkMeta.carrier,
          status: "active",
        },
      });

      if (res.data?.success === false) {
        toast.error(res.data?.error || "Offers fetch failed");
      }

      const list = res.data?.offers || res.data || [];
      setOffers(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
      toast.error("Unable to load offers for dropdown (check /distribution/offers API)");
    } finally {
      setLoadingOffers(false);
    }
  };

  const refreshAllForLink = async (link) => {
    if (!link) return;
    await Promise.all([loadMeta(link), loadRules(link), loadRemaining(link)]);
    // meta set hone ke baad offers load karo
    setTimeout(() => {
      setMeta((m) => {
        if (m) loadOffers(m);
        return m;
      });
    }, 0);
  };

  const handleSelectLink = async (link) => {
    setSelectedLink(link);
    setPreview(null);
    await refreshAllForLink(link);
  };

  /* --------------------------------------------------------
     PARAM TOGGLES
  -------------------------------------------------------- */

  const handleToggleParam = async (key) => {
    if (!selectedLink) return;
    const next = {
      ...(requiredParams || {}),
      [key]: !requiredParams?.[key],
    };
    setRequiredParams(next);
    setSavingParams(true);
    try {
      await apiClient.put(
        `/distribution/update-required-params/${selectedLink.tracking_link_id}`,
        { required_params: next }
      );
    } catch (e) {
      console.error(e);
      toast.error("Failed to update required parameters");
    } finally {
      setSavingParams(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!finalTrackingUrl) return;
    try {
      await navigator.clipboard.writeText(finalTrackingUrl);
      toast.success("Tracking URL copied to clipboard");
    } catch (e) {
      console.error(e);
      toast.error("Unable to copy URL");
    }
  };

  /* --------------------------------------------------------
     PREVIEW
  -------------------------------------------------------- */

  const runPreview = async () => {
    if (!selectedLink || !meta) return;
    setPreviewLoading(true);
    setPreview(null);
    try {
      const res = await apiClient.get("/distribution/rotation/preview", {
        params: {
          pub_id: pubId.trim(),
          tracking_link_id: selectedLink.tracking_link_id,
          geo: meta.geo,
          carrier: meta.carrier,
        },
      });
      if (res.data?.success) {
        setPreview(res.data);
      } else {
        toast.error(res.data?.error || "Preview failed");
      }
    } catch (e) {
      console.error(e);
      toast.error("Preview call failed");
    } finally {
      setPreviewLoading(false);
    }
  };

  /* --------------------------------------------------------
     RULE CRUD
  -------------------------------------------------------- */

  const openAddRule = () => {
    if (!selectedLink) {
      toast.error("Select a tracking link first");
      return;
    }
    setEditingRule(null);
    setShowRuleModal(true);
  };

  const openEditRule = (rule) => {
    setEditingRule(rule);
    setShowRuleModal(true);
  };

  const saveRule = async (form) => {
    if (!selectedLink) return;

    setSavingRule(true);
    try {
      // OFFER ID: always OFF01 / OFF02...
      const cleanOfferId = (form.offerId || "").trim();

      const payload = {
        pub_id: pubId.trim(),
        tracking_link_id: selectedLink.tracking_link_id,
        offer_id: cleanOfferId,
        geo: form.geo || "ALL",
        carrier: form.carrier || "ALL",
        is_fallback: form.fallback,
        weight: form.weight ? Number(form.weight) : null,
        autoFill: !form.weight,
        status: form.status,
      };

      if (!payload.offer_id) {
        toast.error("Offer is required");
        setSavingRule(false);
        return;
      }

      let res;
      if (editingRule) {
        res = await apiClient.put(
          `/distribution/rules/${editingRule.id}`,
          payload
        );
      } else {
        res = await apiClient.post("/distribution/rules", payload);
      }

      if (!res.data?.success) {
        // backend se logical error aaya (200 + success:false)
        if (res.data.error === "duplicate_rule") {
          toast.error("Duplicate rule for same Offer + GEO + Carrier.");
        } else if (res.data.error === "weight_exceeded") {
          toast.error("Total weight exceeds 100% for this tracking link.");
        } else if (res.data.error === "pub_id_tracking_link_id_offer_id_required") {
          toast.error("pub_id / tracking_link_id / offer_id missing.");
        } else {
          toast.error(res.data.error || "Failed to save rule");
        }
        setSavingRule(false);
        return;
      }

      toast.success(editingRule ? "Rule updated" : "Rule added");

      setShowRuleModal(false);
      setEditingRule(null);
      await Promise.all([loadRules(selectedLink), loadRemaining(selectedLink)]);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save rule (network/server error)");
    } finally {
      setSavingRule(false);
    }
  };

  const deleteRule = async (rule) => {
    if (!window.confirm("Delete this rule?")) return;
    try {
      await apiClient.delete(`/distribution/rules/${rule.id}`);
      toast.success("Rule deleted");
      await Promise.all([loadRules(selectedLink), loadRemaining(selectedLink)]);
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete rule");
    }
  };

  /* --------------------------------------------------------
     EFFECTS
  -------------------------------------------------------- */

  useEffect(() => {
    // optional: auto-load default PUB on mount
    // loadTrackingLinks();
  }, []);

  /* --------------------------------------------------------
     RENDER
  -------------------------------------------------------- */

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Traffic Distribution
          </h1>
          <p className="text-sm text-gray-500">
            Manage rotation rules, required tracking parameters & offer caps
            per publisher tracking link.
          </p>
        </div>
      </div>

      {/* TOP BAR: PUB ID + LOAD + SEARCH */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Publisher ID
          </label>
          <input
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={pubId}
            onChange={(e) => setPubId(e.target.value)}
            placeholder="PUB01 / PUB02 / PUB03..."
          />
        </div>

        <button
          onClick={loadTrackingLinks}
          disabled={loadingLinks}
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:opacity-60"
        >
          {loadingLinks ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Load
            </>
          )}
        </button>

        <div className="flex-1 md:max-w-md">
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Search tracking links
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <input
              className="w-full rounded-md border border-gray-200 bg-white pl-8 pr-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Search by ID, URL or publisher name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT: LIST OF TRACKING LINKS */}
        <div className="space-y-2 lg:col-span-1">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-gray-400" />
            Publisher Tracking Links
          </h2>

          <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
            {filteredLinks.map((link) => {
              const active =
                selectedLink?.tracking_link_id === link.tracking_link_id;
              return (
                <button
                  key={link.tracking_link_id}
                  onClick={() => handleSelectLink(link)}
                  className={classNames(
                    "w-full text-left rounded-lg border px-3 py-2 text-sm shadow-sm transition",
                    active
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50/60"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {link.tracking_id || `${link.pub_code}-${link.geo}-${link.carrier}`}
                    </span>
                    <span className="text-[11px] rounded-full bg-gray-100 px-2 py-0.5 text-gray-500">
                      {link.type} · {link.payout}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {link.geo} · {link.carrier}
                    </span>
                    <span>{link.publisher_name}</span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-[11px] text-gray-400">
                    {link.tracking_url}
                  </p>
                </button>
              );
            })}

            {!loadingLinks && !links.length && (
              <p className="text-xs text-gray-400">
                Enter a Publisher ID and click <b>Load</b> to see tracking
                links.
              </p>
            )}
          </div>
        </div>

        {/* RIGHT: DETAIL (OVERVIEW + RULES) */}
        <div className="space-y-4 lg:col-span-2">
          {/* OVERVIEW CARD */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">
                  Overview
                </h2>
                <p className="text-xs text-gray-500">
                  Publisher, GEO, carrier & final tracking URL.
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] uppercase tracking-wide text-gray-400">
                  Remaining Weight
                </span>
                <div
                  className={classNames(
                    "text-sm font-semibold",
                    remaining === 0 ? "text-red-500" : "text-green-600"
                  )}
                >
                  {remaining}% free
                </div>
              </div>
            </div>

            {/* META ROW */}
            {meta ? (
              <>
                <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                  <div className="space-y-1">
                    <div>
                      <span className="text-xs font-semibold text-gray-500">
                        Publisher:
                      </span>{" "}
                      <span className="font-medium">{meta.pub_code}</span>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-gray-500">
                        GEO:
                      </span>{" "}
                      <span className="font-medium">{meta.geo}</span>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-gray-500">
                        Carrier:
                      </span>{" "}
                      <span className="font-medium">{meta.carrier}</span>
                    </div>
                  </div>

                  {/* URL + COPY */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">
                      Tracking URL (with required params)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        className="flex-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-700 focus:outline-none"
                        value={finalTrackingUrl || ""}
                      />
                      <button
                        onClick={handleCopyUrl}
                        disabled={!finalTrackingUrl}
                        className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-2 text-gray-600 shadow-sm hover:bg-gray-50 disabled:opacity-60"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Example:{" "}
                      <code className="rounded bg-gray-100 px-1">
                        &click_id={"{CLICK_ID}"}&ip={"{IP}"}&ua={"{UA}"}
                      </code>
                    </p>
                  </div>
                </div>

                {/* PARAM TOGGLES */}
                <div className="mt-4 border-t border-dashed border-gray-200 pt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-500">
                      Required Parameters
                    </p>
                    {savingParams && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Loader2 className="h-3 w-3 animate-spin" /> saving...
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {PARAM_ORDER.map((key) => {
                      const active = requiredParams?.[key];
                      return (
                        <button
                          key={key}
                          onClick={() => handleToggleParam(key)}
                          className={classNames(
                            "rounded-full border px-3 py-1 text-xs font-medium transition",
                            active
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : "border-gray-200 bg-white text-gray-500 hover:border-blue-300 hover:text-blue-600"
                          )}
                        >
                          {PARAM_LABELS[key] || key.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-1 text-[11px] text-gray-400">
                    Click to toggle which parameters are required & appended to
                    the final click URL.
                  </p>
                </div>

                {/* PREVIEW SECTION */}
                <div className="mt-4 border-t border-dashed border-gray-200 pt-3 grid gap-3 md:grid-cols-[auto,1fr]">
                  <button
                    onClick={runPreview}
                    disabled={previewLoading}
                    className="inline-flex items-center justify-center rounded-md bg-gray-900 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-black disabled:opacity-60"
                  >
                    {previewLoading ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-3 w-3" />
                        Rotation Preview
                      </>
                    )}
                  </button>
                  <div className="text-xs text-gray-500">
                    {preview ? (
                      preview.selected ? (
                        <div className="space-y-1">
                          <p>
                            Selected Offer ID:{" "}
                            <b>{preview.selected.offer_id}</b> (
                            {preview.type || "primary"})
                          </p>
                        </div>
                      ) : (
                        <p>
                          No eligible rule matched (reason: {preview.reason})
                        </p>
                      )
                    ) : (
                      <p className="text-gray-400">
                        Run preview to simulate which offer will be served for
                        this GEO & carrier.
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : selectedLink ? (
              <p className="mt-3 text-xs text-gray-400">
                Loading overview for selected link...
              </p>
            ) : (
              <p className="mt-3 text-xs text-gray-400">
                Select a tracking link from the left panel to see its overview.
              </p>
            )}
          </div>

          {/* RULES CARD */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Rules</h2>
                <p className="text-xs text-gray-500">
                  Define offer rotation, GEO/carrier targeting & fallback logic.
                </p>
              </div>
              <button
                onClick={openAddRule}
                disabled={!selectedLink}
                className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Rule
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="min-w-full divide-y divide-gray-100 text-xs">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">
                      Offer ID
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">
                      GEO
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">
                      Carrier
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">
                      % Weight
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">
                      Fallback
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">
                      Status
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50/70">
                      <td className="px-3 py-2 font-mono text-[11px] text-gray-800">
                        {rule.offer_id}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {rule.geo || "ALL"}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {rule.carrier || "ALL"}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {rule.weight}%
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={classNames(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                            rule.is_fallback
                              ? "bg-purple-50 text-purple-700"
                              : "bg-gray-50 text-gray-400"
                          )}
                        >
                          {rule.is_fallback ? "YES" : "NO"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={classNames(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                            rule.status === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : rule.status === "paused"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-600"
                          )}
                        >
                          {rule.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => openEditRule(rule)}
                          className="mr-2 text-[11px] font-medium text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteRule(rule)}
                          className="text-[11px] font-medium text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!rules.length && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-4 text-center text-[11px] text-gray-400"
                      >
                        No rules configured yet. Add first rule for this
                        tracking link.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <p className="mt-2 text-[11px] text-gray-400">
              Total weight for this tracking link cannot exceed 100%. Use
              AutoFill to automatically use remaining % for a rule.
            </p>
          </div>
        </div>
      </div>

      {/* RULE MODAL */}
      {showRuleModal && (
        <RuleModal
          open={showRuleModal}
          onClose={() => {
            if (!savingRule) {
              setShowRuleModal(false);
              setEditingRule(null);
            }
          }}
          onSave={saveRule}
          rule={editingRule}
          remaining={remaining}
          offers={offers}
          loadingOffers={loadingOffers}
          saving={savingRule}
          meta={meta}
        />
      )}
    </div>
  );
}

/* --------------------------------------------------------
   RULE MODAL (INLINE COMPONENT) — FIXED VERSION
-------------------------------------------------------- */

function RuleModal({
  open,
  onClose,
  onSave,
  rule,
  remaining,
  offers,
  loadingOffers,
  saving,
  meta,
}) {
  const [offerId, setOfferId] = useState(rule?.offer_id || "");
  const [geo, setGeo] = useState(rule?.geo || meta?.geo || "ALL");
  const [carrier, setCarrier] = useState(rule?.carrier || meta?.carrier || "ALL");
  const [weight, setWeight] = useState(rule?.weight != null ? String(rule.weight) : "");
  const [fallback, setFallback] = useState(!!rule?.is_fallback);
  const [status, setStatus] = useState(rule?.status || "active");

  const handleSubmit = (e) => {
    e.preventDefault();

    // PURE offer_id extraction
    const cleanOffer = (offerId || "").split("—")[0].trim(); // OFF02 only

    onSave({
      offerId: cleanOffer, // always OFFXX
      geo,
      carrier,
      weight,
      fallback,
      status,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">
              {rule ? "Edit Distribution Rule" : "Add Distribution Rule"}
            </h2>
            <p className="text-[11px] text-gray-500">
              Active offers for this publisher / GEO / carrier.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          {/* OFFER */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">
              OFFER ID <span className="text-red-500">*</span>
            </label>

            <select
              value={offerId}
              onChange={(e) => setOfferId(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm
              focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Select Offer (OFF01, OFF02...)</option>

              {offers.map((o) => (
                <option
                  key={o.offer_id}
                  value={o.offer_id}   // ALWAYS PURE VALUE = OFF02
                >
                  {o.offer_id + (o.name ? ` — ${o.name}` : "")}
                </option>
              ))}
            </select>

            {loadingOffers && (
              <p className="text-[11px] text-gray-400">
                Loading offers for this GEO / carrier...
              </p>
            )}
          </div>

          {/* GEO + CARRIER */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">GEO</label>
              <input
                value={geo}
                onChange={(e) => setGeo(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm"/>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Carrier</label>
              <input
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm"/>
            </div>
          </div>

          {/* WEIGHT */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">WEIGHT (%)</label>
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={`Leave blank for AutoFill (remaining ${remaining}%)`}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm"
            />
          </div>

          {/* FALLBACK + STATUS */}
          <div className="flex items-center justify-between border-t border-dashed pt-3">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={fallback}
                onChange={(e) => setFallback(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Fallback Rule
            </label>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-32 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
            >
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="deleted">deleted</option>
            </select>
          </div>

          {/* ACTIONS */}
          <div className="mt-2 flex justify-end gap-3 border-t pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm">
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
            >
              {saving ? "Saving..." : "Save Rule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
