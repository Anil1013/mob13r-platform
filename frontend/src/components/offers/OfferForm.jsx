import { useEffect, useMemo, useState } from "react";
import { OFFER_API_SCHEMA } from "../../config/offerApiSchema";

/* ================= DEFAULT OFFER ================= */
const emptyOffer = {
  advertiser_id: "",
  name: "",
  geo: "",
  carrier: "",
  payout: 0,
  revenue: 0,
  daily_cap: 0,
  redirect_url: "",
  fallback_offer_id: "",
  is_active: true,
  api_steps: {},
};

export default function OfferForm({ initialData, onSave, onClose }) {
  const [form, setForm] = useState(emptyOffer);

  /* ================= INIT ================= */
  useEffect(() => {
    if (initialData) {
      setForm({
        ...emptyOffer,
        ...initialData,
        api_steps: normalizeSteps(initialData.api_steps),
      });
    } else {
      const steps = {};
      Object.entries(OFFER_API_SCHEMA).forEach(([k, cfg]) => {
        steps[k] = { ...cfg.default };
      });
      setForm({ ...emptyOffer, api_steps: steps });
    }
  }, [initialData]);

  /* ================= HELPERS ================= */
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const setStep = (step, key, val) => {
    setForm((p) => ({
      ...p,
      api_steps: {
        ...p.api_steps,
        [step]: {
          ...p.api_steps[step],
          [key]: val,
        },
      },
    }));
  };

  const addKV = (step, type) => {
    const obj = form.api_steps[step]?.[type] || {};
    setStep(step, type, { ...obj, "": "" });
  };

  const updateKV = (step, type, k, v, oldKey) => {
    const obj = { ...(form.api_steps[step]?.[type] || {}) };
    delete obj[oldKey];
    obj[k] = v;
    setStep(step, type, obj);
  };

  const removeKV = (step, type, k) => {
    const obj = { ...(form.api_steps[step]?.[type] || {}) };
    delete obj[k];
    setStep(step, type, obj);
  };

  /* ================= USED PARAMS ================= */
  const usedParams = useMemo(() => {
    const found = new Set();
    const regex = /<coll_[a-zA-Z0-9_]+>/g;

    Object.values(form.api_steps || {}).forEach((s) => {
      const scan = (v) => {
        if (!v) return;
        const txt = typeof v === "string" ? v : JSON.stringify(v);
        (txt.match(regex) || []).forEach((m) => found.add(m));
      };
      scan(s.url);
      scan(s.headers);
      scan(s.params);
      scan(s.success_matcher);
    });

    return Array.from(found);
  }, [form.api_steps]);

  /* ================= SAVE ================= */
  const handleSave = () => {
    if (!form.name) return alert("Offer name required");

    for (const [step, cfg] of Object.entries(OFFER_API_SCHEMA)) {
      const s = form.api_steps[step];
      if (s?.enabled && !s.url) {
        return alert(`${cfg.label}: URL required`);
      }
      if (s?.enabled && !s.url.startsWith("http")) {
        return alert(`${cfg.label}: Invalid URL`);
      }
    }

    const payload = {
      ...form,
      payout: Number(form.payout || 0),
      revenue: Number(form.revenue || 0),
      daily_cap: Number(form.daily_cap || 0),
      api_steps: normalizeSteps(form.api_steps),
    };

    onSave(payload);
  };

  /* ================= UI ================= */
  return (
    <div className="card p-4 space-y-6">
      <h2 className="text-xl font-bold">
        {initialData ? "Edit Offer" : "Create Offer"}
      </h2>

      {/* USED PARAMS */}
      {usedParams.length > 0 && (
        <div className="bg-slate-900 p-3 rounded">
          <div className="text-sm font-semibold mb-1">📊 Used Params</div>
          <div className="flex flex-wrap gap-2">
            {usedParams.map((p) => (
              <span key={p} className="px-2 py-1 bg-blue-600 text-xs rounded">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* BASIC INFO */}
      <div className="grid grid-cols-2 gap-4">
        <input
          placeholder="Offer Name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />

        <input
          placeholder="Advertiser ID"
          value={form.advertiser_id}
          onChange={(e) => set("advertiser_id", e.target.value)}
        />

        <input
          placeholder="Geo"
          value={form.geo}
          onChange={(e) => set("geo", e.target.value)}
        />

        <input
          placeholder="Carrier"
          value={form.carrier}
          onChange={(e) => set("carrier", e.target.value)}
        />

        <input
          type="number"
          placeholder="Payout"
          value={form.payout}
          onChange={(e) => set("payout", e.target.value)}
        />

        <input
          type="number"
          placeholder="Revenue"
          value={form.revenue}
          onChange={(e) => set("revenue", e.target.value)}
        />

        <input
          type="number"
          placeholder="Daily Cap"
          value={form.daily_cap}
          onChange={(e) => set("daily_cap", e.target.value)}
        />

        <input
          className="col-span-2"
          placeholder="Redirect URL"
          value={form.redirect_url}
          onChange={(e) => set("redirect_url", e.target.value)}
        />

        <input
          className="col-span-2"
          placeholder="Fallback Offer ID (optional)"
          value={form.fallback_offer_id}
          onChange={(e) => set("fallback_offer_id", e.target.value)}
        />

        <label className="flex items-center gap-2 col-span-2">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => set("is_active", e.target.checked)}
          />
          Offer Active
        </label>
      </div>

      {/* API STEPS */}
      {Object.entries(OFFER_API_SCHEMA).map(([step, cfg]) => {
        const data = form.api_steps[step] || {};
        return (
          <div key={step} className="border rounded p-4 space-y-3">
            <div className="flex justify-between">
              <h3 className="font-semibold">{cfg.label}</h3>
              <input
                type="checkbox"
                checked={!!data.enabled}
                onChange={(e) => setStep(step, "enabled", e.target.checked)}
              />
            </div>

            <div className="flex gap-2">
              <select
                value={data.method || "GET"}
                onChange={(e) => setStep(step, "method", e.target.value)}
              >
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>PATCH</option>
              </select>

              <input
                className="w-full font-mono text-sm"
                placeholder="https://api.endpoint/path"
                value={data.url || ""}
                onChange={(e) => setStep(step, "url", e.target.value)}
              />
            </div>

            <Section
              title="Headers"
              step={step}
              type="headers"
              data={data}
              templates={cfg.templates}
              addKV={addKV}
              updateKV={updateKV}
              removeKV={removeKV}
            />

            <Section
              title="Params / Body"
              step={step}
              type="params"
              data={data}
              templates={cfg.templates}
              addKV={addKV}
              updateKV={updateKV}
              removeKV={removeKV}
            />

            <input
              placeholder='Success Matcher (e.g. "status":true)'
              value={data.success_matcher || ""}
              onChange={(e) =>
                setStep(step, "success_matcher", e.target.value)
              }
            />
          </div>
        );
      })}

      {/* ACTIONS */}
      <div className="flex gap-3">
        <button className="btn btn-primary" onClick={handleSave}>
          Save Offer
        </button>
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ================= SUB COMPONENT ================= */
function Section({
  title,
  step,
  type,
  data,
  templates,
  addKV,
  updateKV,
  removeKV,
}) {
  const obj = data?.[type] || {};
  return (
    <div>
      <h4 className="font-medium">{title}</h4>
      {Object.entries(obj).map(([k, v]) => (
        <div key={k} className="flex gap-2 mb-1">
          <input
            placeholder="key"
            value={k}
            onChange={(e) =>
              updateKV(step, type, e.target.value, v, k)
            }
          />
          <input
            placeholder="value"
            value={v}
            onChange={(e) =>
              updateKV(step, type, k, e.target.value, k)
            }
          />
          <button onClick={() => removeKV(step, type, k)}>✕</button>
        </div>
      ))}
      <button onClick={() => addKV(step, type)}>+ Add {title}</button>
      <div className="text-xs text-gray-500 mt-1">
        Templates: {templates.map((t) => `<coll_${t}>`).join(", ")}
      </div>
    </div>
  );
}

/* ================= NORMALIZER ================= */
function normalizeSteps(steps = {}) {
  const out = {};
  Object.entries(OFFER_API_SCHEMA).forEach(([k, cfg]) => {
    const s = steps?.[k] || {};
    out[k] = {
      enabled: !!s.enabled,
      method: s.method || cfg.default.method,
      url: s.url || "",
      headers: s.headers || {},
      params: s.params || {},
      success_matcher: s.success_matcher || "",
    };
  });
  return out;
}
