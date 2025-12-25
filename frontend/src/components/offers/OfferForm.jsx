import { useEffect, useState } from "react";
import { getAdvertisers } from "../../services/advertisers";
import { OFFER_API_SCHEMA } from "../../config/offerApiSchema";

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
  redirect_url: "",
  api_steps: {},
};

export default function OfferForm({ onClose, onSave, initialData }) {
  const [advertisers, setAdvertisers] = useState([]);
  const [offer, setOffer] = useState(DEFAULT_OFFER);

  /* ================= LOAD ADVERTISERS ================= */
  useEffect(() => {
    getAdvertisers().then((res) => setAdvertisers(res || []));
  }, []);

  /* ================= INIT CREATE / EDIT ================= */
  useEffect(() => {
    if (!initialData) {
      const steps = {};
      Object.entries(OFFER_API_SCHEMA).forEach(([k, v]) => {
        steps[k] = structuredClone(v.default);
      });
      setOffer({ ...DEFAULT_OFFER, api_steps: steps });
      return;
    }

    const steps = {};
    Object.entries(OFFER_API_SCHEMA).forEach(([k, v]) => {
      steps[k] = {
        ...v.default,
        ...(initialData.api_steps?.[k] || {}),
      };
    });

    setOffer({
      ...DEFAULT_OFFER,
      ...initialData,
      api_steps: steps,
    });
  }, [initialData]);

  /* ================= BASIC CHANGE ================= */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setOffer((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  /* ================= STEP CHANGE ================= */
  const updateStep = (step, field, value) => {
    setOffer((p) => ({
      ...p,
      api_steps: {
        ...p.api_steps,
        [step]: {
          ...p.api_steps[step],
          [field]: value,
        },
      },
    }));
  };

  /* ================= PARAM / HEADER ================= */
  const updateKeyValue = (step, field, key, value) => {
    setOffer((p) => ({
      ...p,
      api_steps: {
        ...p.api_steps,
        [step]: {
          ...p.api_steps[step],
          [field]: {
            ...p.api_steps[step][field],
            [key]: value,
          },
        },
      },
    }));
  };

  const removeKeyValue = (step, field, key) => {
    setOffer((p) => {
      const obj = { ...p.api_steps[step][field] };
      delete obj[key];
      return {
        ...p,
        api_steps: {
          ...p.api_steps,
          [step]: { ...p.api_steps[step], [field]: obj },
        },
      };
    });
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...offer,
      payout: Number(offer.payout || 0),
      cap: Number(offer.cap || 0),
      revenue: Number(offer.revenue || 0),
    });
  };

  return (
    <div style={styles.overlay}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h2>{initialData ? "Edit Offer" : "Create Offer"}</h2>

        {/* ================= BASIC ================= */}
        <Section title="Basic">
          <Input label="Offer Name" name="name" value={offer.name} onChange={handleChange} />
          <Select label="Advertiser" name="advertiser_id" value={offer.advertiser_id} onChange={handleChange} options={advertisers} />
          <Row>
            <Input label="Geo" name="geo" value={offer.geo} onChange={handleChange} />
            <Input label="Carrier" name="carrier" value={offer.carrier} onChange={handleChange} />
          </Row>
          <Row>
            <Input label="Payout" name="payout" value={offer.payout} onChange={handleChange} />
            <Input label="Cap" name="cap" value={offer.cap} onChange={handleChange} />
            <Input label="Revenue" name="revenue" value={offer.revenue} onChange={handleChange} />
          </Row>
          <Input label="Redirect URL" name="redirect_url" value={offer.redirect_url} onChange={handleChange} />
        </Section>

        {/* ================= API STEPS ================= */}
        {Object.entries(OFFER_API_SCHEMA).map(([key, schema]) => {
          const step = offer.api_steps[key];
          if (!step) return null;

          return (
            <Section key={key} title={schema.label}>
              <p style={styles.desc}>{schema.description}</p>

              <Checkbox
                label="Enabled"
                checked={step.enabled}
                onChange={(e) => updateStep(key, "enabled", e.target.checked)}
              />

              <Row>
                <select
                  value={step.method}
                  onChange={(e) => updateStep(key, "method", e.target.value)}
                  style={styles.select}
                >
                  <option>GET</option>
                  <option>POST</option>
                </select>

                <input
                  value={step.url}
                  onChange={(e) => updateStep(key, "url", e.target.value)}
                  placeholder="API URL"
                  style={styles.input}
                />
              </Row>

              <KeyValueEditor
                title="Headers"
                data={step.headers}
                onAdd={(k, v) => updateKeyValue(key, "headers", k, v)}
                onRemove={(k) => removeKeyValue(key, "headers", k)}
                templates={schema.templates}
              />

              <KeyValueEditor
                title="Params / Body"
                data={step.params}
                onAdd={(k, v) => updateKeyValue(key, "params", k, v)}
                onRemove={(k) => removeKeyValue(key, "params", k)}
                templates={schema.templates}
              />

              <Input
                label="Success Matcher"
                value={step.success_matcher}
                onChange={(e) => updateStep(key, "success_matcher", e.target.value)}
                placeholder="e.g. success=true"
              />
            </Section>
          );
        })}

        {/* ================= ACTIONS ================= */}
        <div style={styles.actions}>
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit">{initialData ? "Update" : "Save"}</button>
        </div>
      </form>
    </div>
  );
}

/* ================= KEY VALUE EDITOR ================= */
const KeyValueEditor = ({ title, data = {}, onAdd, onRemove, templates }) => {
  const [k, setK] = useState("");
  const [v, setV] = useState("");

  return (
    <div>
      <strong>{title}</strong>
      {Object.entries(data).map(([key, val]) => (
        <div key={key} style={styles.kv}>
          <span>{key}: {val}</span>
          <button type="button" onClick={() => onRemove(key)}>✕</button>
        </div>
      ))}

      <div style={styles.kv}>
        <input placeholder="key" value={k} onChange={(e) => setK(e.target.value)} />
        <input placeholder="value" value={v} onChange={(e) => setV(e.target.value)} />
        <button type="button" onClick={() => { onAdd(k, v); setK(""); setV(""); }}>+</button>
      </div>

      <div style={styles.templates}>
        {templates.map((t) => (
          <span key={t} onClick={() => setV(`<coll_${t}>`)}>{`<coll_${t}>`}</span>
        ))}
      </div>
    </div>
  );
};

/* ================= UI HELPERS ================= */
const Section = ({ title, children }) => (
  <div style={styles.section}>
    <h4>{title}</h4>
    {children}
  </div>
);

const Input = ({ label, ...p }) => (
  <div>
    <label>{label}</label>
    <input {...p} style={styles.input} />
  </div>
);

const Select = ({ label, options, ...p }) => (
  <div>
    <label>{label}</label>
    <select {...p} style={styles.select}>
      <option value="">Select</option>
      {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  </div>
);

const Checkbox = ({ label, ...p }) => (
  <label><input type="checkbox" {...p} /> {label}</label>
);

const Row = ({ children }) => <div style={{ display: "flex", gap: 8 }}>{children}</div>;

/* ================= STYLES ================= */
const styles = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", justifyContent: "center", alignItems: "center" },
  card: { width: 900, maxHeight: "90vh", overflowY: "auto", background: "#020617", padding: 24, borderRadius: 12, color: "#fff" },
  section: { marginBottom: 24 },
  input: { padding: 8, width: "100%", background: "#020617", color: "#fff", border: "1px solid #1e293b" },
  select: { padding: 8, background: "#020617", color: "#fff" },
  actions: { display: "flex", justifyContent: "space-between" },
  kv: { display: "flex", gap: 6, alignItems: "center" },
  templates: { display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11, cursor: "pointer" },
  desc: { fontSize: 12, color: "#94a3b8" },
};
