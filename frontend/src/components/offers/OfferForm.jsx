import { useEffect, useState } from "react";
import { getAdvertisers } from "../../services/advertisers";

/* ================= PARAM TEMPLATES ================= */
const TEMPLATE_PARAMS = [
  "<coll_msisdn>",
  "<coll_token>",
  "<coll_uuid_trxid>",
  "<coll_pin>",
  "<coll_ip>",
  "<coll_userip>",
  "<coll_ua>",
  "<coll_base64_ua>",
  "<anti_fraud_id>",
  "<param1>",
  "<param2>",
];

/* ================= DEFAULT OFFER ================= */
const DEFAULT_OFFER = {
  name: "",
  advertiser_id: "",
  geo: "",
  carrier: "",
  payout: "",
  cap: "",
  revenue: "",
  is_active: true,

  api_steps: {
    status_check: createStep(),
    pin_send: createStep(),
    pin_verify: createStep(),
    redirect: {
      enabled: false,
      url: "",
    },
    anti_fraud: createStep(),
  },
};

function createStep() {
  return {
    enabled: true,
    method: "POST",
    url: "",
    headers: [{ key: "", value: "" }],
    params: [{ key: "", value: "" }],
    success_matcher: "",
  };
}

/* ================= COMPONENT ================= */
export default function OfferForm({ onClose, onSave, initialData }) {
  const [advertisers, setAdvertisers] = useState([]);
  const [offer, setOffer] = useState(DEFAULT_OFFER);

  /* LOAD ADVERTISERS */
  useEffect(() => {
    getAdvertisers().then(setAdvertisers);
  }, []);

  /* LOAD EDIT */
  useEffect(() => {
    if (!initialData) return;

    setOffer({
      ...DEFAULT_OFFER,
      ...initialData,
    });
  }, [initialData]);

  /* HANDLERS */
  const updateStep = (step, field, value) => {
    setOffer((p) => ({
      ...p,
      api_steps: {
        ...p.api_steps,
        [step]: { ...p.api_steps[step], [field]: value },
      },
    }));
  };

  const updateKV = (step, type, index, field, value) => {
    const list = [...offer.api_steps[step][type]];
    list[index][field] = value;
    updateStep(step, type, list);
  };

  const addKV = (step, type) =>
    updateStep(step, type, [...offer.api_steps[step][type], { key: "", value: "" }]);

  const removeKV = (step, type, i) =>
    updateStep(
      step,
      type,
      offer.api_steps[step][type].filter((_, x) => x !== i)
    );

  const submit = (e) => {
    e.preventDefault();
    onSave({
      ...offer,
      payout: Number(offer.payout || 0),
      cap: Number(offer.cap || 0),
      revenue: Number(offer.revenue || 0),
    });
  };

  return (
    <div style={S.overlay}>
      <form style={S.card} onSubmit={submit}>
        <h2>{initialData ? "Edit Offer" : "Create Offer"}</h2>

        {/* BASIC */}
        <Section title="Basic">
          <Input label="Name" value={offer.name} onChange={(e) => setOffer({ ...offer, name: e.target.value })} />
          <Select
            label="Advertiser"
            value={offer.advertiser_id}
            onChange={(e) => setOffer({ ...offer, advertiser_id: e.target.value })}
            options={advertisers}
          />
          <Row>
            <Input label="Payout" value={offer.payout} onChange={(e) => setOffer({ ...offer, payout: e.target.value })} />
            <Input label="Daily Cap" value={offer.cap} onChange={(e) => setOffer({ ...offer, cap: e.target.value })} />
            <Input label="Revenue" value={offer.revenue} onChange={(e) => setOffer({ ...offer, revenue: e.target.value })} />
          </Row>
        </Section>

        {/* STEPS */}
        {["status_check", "pin_send", "pin_verify", "anti_fraud"].map((step) => (
          <ApiStep
            key={step}
            title={step.replace("_", " ").toUpperCase()}
            data={offer.api_steps[step]}
            onToggle={(v) => updateStep(step, "enabled", v)}
            onChange={(f, v) => updateStep(step, f, v)}
            onKVChange={(t, i, f, v) => updateKV(step, t, i, f, v)}
            onAddKV={(t) => addKV(step, t)}
            onRemoveKV={(t, i) => removeKV(step, t, i)}
          />
        ))}

        {/* REDIRECT */}
        <Section title="Redirect">
          <Input
            label="Redirect URL"
            value={offer.api_steps.redirect.url}
            onChange={(e) =>
              setOffer((p) => ({
                ...p,
                api_steps: { ...p.api_steps, redirect: { enabled: true, url: e.target.value } },
              }))
            }
          />
        </Section>

        <div style={S.actions}>
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit">Save</button>
        </div>
      </form>
    </div>
  );
}

/* ================= API STEP UI ================= */
const ApiStep = ({ title, data, onToggle, onChange, onKVChange, onAddKV, onRemoveKV }) => (
  <Section title={title}>
    <Checkbox label="Enabled" checked={data.enabled} onChange={(e) => onToggle(e.target.checked)} />
    <select value={data.method} onChange={(e) => onChange("method", e.target.value)}>
      <option>POST</option>
      <option>GET</option>
    </select>
    <Input label="URL" value={data.url} onChange={(e) => onChange("url", e.target.value)} />

    <KV title="Headers" list={data.headers} onChange={(i, f, v) => onKVChange("headers", i, f, v)} onAdd={() => onAddKV("headers")} onRemove={(i) => onRemoveKV("headers", i)} />
    <KV title="Params / Body" list={data.params} onChange={(i, f, v) => onKVChange("params", i, f, v)} onAdd={() => onAddKV("params")} onRemove={(i) => onRemoveKV("params", i)} />

    <Input label="Success Matcher" value={data.success_matcher} onChange={(e) => onChange("success_matcher", e.target.value)} />

    <TemplateHints />
  </Section>
);

/* ================= KV BUILDER ================= */
const KV = ({ title, list, onChange, onAdd, onRemove }) => (
  <>
    <h5>{title}</h5>
    {list.map((r, i) => (
      <Row key={i}>
        <input placeholder="key" value={r.key} onChange={(e) => onChange(i, "key", e.target.value)} />
        <input placeholder="value / <template>" value={r.value} onChange={(e) => onChange(i, "value", e.target.value)} />
        <button type="button" onClick={() => onRemove(i)}>✕</button>
      </Row>
    ))}
    <button type="button" onClick={onAdd}>+ Add</button>
  </>
);

/* ================= TEMPLATE HINTS ================= */
const TemplateHints = () => (
  <div style={{ fontSize: 11, opacity: 0.7 }}>
    Templates:
    {TEMPLATE_PARAMS.map((t) => (
      <span key={t} style={{ marginLeft: 6 }}>{t}</span>
    ))}
  </div>
);

/* ================= UI ================= */
const Section = ({ title, children }) => (
  <div style={{ marginBottom: 24 }}>
    <h4 style={{ color: "#38bdf8" }}>{title}</h4>
    {children}
  </div>
);

const Input = ({ label, ...p }) => (
  <div>
    <label>{label}</label>
    <input {...p} />
  </div>
);

const Select = ({ label, options, ...p }) => (
  <div>
    <label>{label}</label>
    <select {...p}>
      <option value="">Select</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.name}</option>
      ))}
    </select>
  </div>
);

const Checkbox = (p) => <label><input type="checkbox" {...p} /> {p.label}</label>;
const Row = ({ children }) => <div style={{ display: "flex", gap: 8 }}>{children}</div>;

const S = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.6)" },
  card: { background: "#020617", padding: 24, width: 900, maxHeight: "90vh", overflow: "auto" },
  actions: { display: "flex", justifyContent: "space-between" },
};
