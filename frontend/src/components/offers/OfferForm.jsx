import { useEffect, useMemo, useState } from "react";
import { OFFER_API_SCHEMA } from "../../config/offerApiSchema";

const emptyOffer = {
  advertiser_id: "",
  name: "",
  geo: "",
  carrier: "",
  payout: "",
  revenue: "",
  daily_cap: "",
  redirect_url: "",
  fallback_offer_id: "",
  is_active: true,
  api_steps: {},
};

export default function OfferForm({ initialData, onSave, onClose }) {
  const [form, setForm] = useState(emptyOffer);

  /* INIT */
  useEffect(() => {
    if (initialData) {
      setForm({
        ...emptyOffer,
        ...initialData,
        api_steps: initialData.api_steps || {},
      });
    } else {
      const steps = {};
      Object.entries(OFFER_API_SCHEMA).forEach(([k, cfg]) => {
        steps[k] = { ...cfg.default };
      });
      setForm((f) => ({ ...f, api_steps: steps }));
    }
  }, [initialData]);

  const set = (k, v) => setForm({ ...form, [k]: v });

  const setStep = (step, key, val) => {
    setForm((p) => ({
      ...p,
      api_steps: {
        ...p.api_steps,
        [step]: { ...p.api_steps[step], [key]: val },
      },
    }));
  };

  /* USED PARAMS */
  const usedParams = useMemo(() => {
    const r = /<coll_[a-zA-Z0-9_]+>/g;
    const found = new Set();
    Object.values(form.api_steps || {}).forEach((s) => {
      const t = JSON.stringify(s);
      (t.match(r) || []).forEach((m) => found.add(m));
    });
    return [...found];
  }, [form.api_steps]);

  const save = () => {
    const payload = {
      ...form,
      payout: Number(form.payout || 0),
      revenue: Number(form.revenue || 0),
      daily_cap: Number(form.daily_cap || 0),
    };
    onSave(payload);
  };

  return (
    <div className="card p-4 space-y-4">
      <h2>{initialData ? "Edit Offer" : "Create Offer"}</h2>

      {usedParams.length > 0 && (
        <div>
          <b>Used Params:</b> {usedParams.join(", ")}
        </div>
      )}

      <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Offer Name" />
      <input value={form.geo} onChange={(e) => set("geo", e.target.value)} placeholder="Geo" />
      <input value={form.carrier} onChange={(e) => set("carrier", e.target.value)} placeholder="Carrier" />
      <input value={form.payout} onChange={(e) => set("payout", e.target.value)} placeholder="Payout" />

      {Object.entries(OFFER_API_SCHEMA).map(([k, cfg]) => (
        <div key={k} style={{ border: "1px solid #333", padding: 8 }}>
          <label>
            <input
              type="checkbox"
              checked={form.api_steps[k]?.enabled}
              onChange={(e) => setStep(k, "enabled", e.target.checked)}
            />
            {cfg.label}
          </label>

          <input
            placeholder="API URL"
            value={form.api_steps[k]?.url || ""}
            onChange={(e) => setStep(k, "url", e.target.value)}
          />
        </div>
      ))}

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={save}>Save</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
