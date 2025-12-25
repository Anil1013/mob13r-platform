import { useEffect, useState } from "react";
import { getAdvertisers } from "../../services/advertisers";

/* ================= DEFAULT ================= */
const DEFAULT_OFFER = {
  name: "",
  advertiser_id: "",
  geo: "",
  carrier: "",
  payout: "",
  revenue: "",
  is_active: true,

  api_mode: "POST",

  status_check_url: "",
  status_check_params: [],

  pin_send_url: "",
  pin_send_params: [],

  pin_verify_url: "",
  pin_verify_params: [],

  redirect_url: "",

  step_status_check: true,
  step_pin_send: true,
  step_pin_verify: true,

  fraud_enabled: false,
  fraud_partner: "",
  fraud_service: "",
};

export default function OfferForm({ onClose, onSave, initialData }) {
  const [advertisers, setAdvertisers] = useState([]);
  const [offer, setOffer] = useState(DEFAULT_OFFER);

  /* ================= LOAD ADVERTISERS ================= */
  useEffect(() => {
    getAdvertisers().then((res) => setAdvertisers(res || []));
  }, []);

  /* ================= LOAD EDIT ================= */
  useEffect(() => {
    if (!initialData) {
      setOffer(DEFAULT_OFFER);
      return;
    }

    setOffer({
      ...DEFAULT_OFFER,
      ...initialData,

      status_check_params: toArray(initialData.status_check_params),
      pin_send_params: toArray(initialData.pin_send_params),
      pin_verify_params: toArray(initialData.pin_verify_params),

      step_status_check: initialData.steps?.status_check ?? true,
      step_pin_send: initialData.steps?.pin_send ?? true,
      step_pin_verify: initialData.steps?.pin_verify ?? true,
    });
  }, [initialData]);

  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setOffer((p) => ({
      ...p,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    onSave({
      ...offer,
      payout: Number(offer.payout || 0),
      revenue: Number(offer.revenue || 0),

      steps: {
        status_check: offer.step_status_check,
        pin_send: offer.step_pin_send,
        pin_verify: offer.step_pin_verify,
      },

      redirect_url: offer.redirect_url || null,
    });
  };

  return (
    <div style={styles.overlay}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h2 style={styles.heading}>
          {initialData ? "Edit Offer" : "Create Offer"}
        </h2>

        {/* ================= BASIC ================= */}
        <Section title="Basic Information">
          <Input label="Offer Name" name="name" value={offer.name} onChange={handleChange} />
          <Select
            label="Advertiser"
            name="advertiser_id"
            value={offer.advertiser_id}
            onChange={handleChange}
            options={advertisers}
          />
          <Row>
            <Input label="Geo" name="geo" value={offer.geo} onChange={handleChange} />
            <Input label="Carrier" name="carrier" value={offer.carrier} onChange={handleChange} />
          </Row>
          <Row>
            <Input label="Payout" name="payout" value={offer.payout} onChange={handleChange} />
            <Input label="Revenue" name="revenue" value={offer.revenue} onChange={handleChange} />
          </Row>
          <Checkbox label="Offer Active" name="is_active" checked={offer.is_active} onChange={handleChange} />
        </Section>

        {/* ================= API MODE ================= */}
        <Section title="API Mode">
          <select name="api_mode" value={offer.api_mode} onChange={handleChange} style={styles.select}>
            <option value="POST">POST</option>
            <option value="GET">GET</option>
          </select>
        </Section>

        {/* ================= STATUS CHECK ================= */}
        <Section title="Status Check API">
          <Input label="URL" name="status_check_url" value={offer.status_check_url} onChange={handleChange} />
          <ParamBuilder
            label="Allowed Parameters"
            values={offer.status_check_params}
            onChange={(v) => setOffer((p) => ({ ...p, status_check_params: v }))}
          />
        </Section>

        {/* ================= PIN SEND ================= */}
        <Section title="PIN Send API">
          <Input label="URL" name="pin_send_url" value={offer.pin_send_url} onChange={handleChange} />
          <ParamBuilder
            label="Allowed Parameters"
            values={offer.pin_send_params}
            onChange={(v) => setOffer((p) => ({ ...p, pin_send_params: v }))}
          />
        </Section>

        {/* ================= PIN VERIFY ================= */}
        <Section title="PIN Verify API">
          <Input label="URL" name="pin_verify_url" value={offer.pin_verify_url} onChange={handleChange} />
          <ParamBuilder
            label="Allowed Parameters"
            values={offer.pin_verify_params}
            onChange={(v) => setOffer((p) => ({ ...p, pin_verify_params: v }))}
          />
        </Section>

        {/* ================= REDIRECT ================= */}
        <Section title="Redirect">
          <Input label="Redirect URL" name="redirect_url" value={offer.redirect_url} onChange={handleChange} />
        </Section>

        {/* ================= STEPS ================= */}
        <Section title="Execution Steps">
          <Checkbox label="Enable Status Check" name="step_status_check" checked={offer.step_status_check} onChange={handleChange} />
          <Checkbox label="Enable PIN Send" name="step_pin_send" checked={offer.step_pin_send} onChange={handleChange} />
          <Checkbox label="Enable PIN Verify" name="step_pin_verify" checked={offer.step_pin_verify} onChange={handleChange} />
        </Section>

        {/* ================= FRAUD ================= */}
        <Section title="Fraud Configuration">
          <Checkbox
            label="Enable Fraud Protection"
            name="fraud_enabled"
            checked={offer.fraud_enabled}
            onChange={handleChange}
          />
          {offer.fraud_enabled && (
            <>
              <Input label="Fraud Partner" name="fraud_partner" value={offer.fraud_partner} onChange={handleChange} />
              <Input label="Fraud Service" name="fraud_service" value={offer.fraud_service} onChange={handleChange} />
            </>
          )}
        </Section>

        {/* ================= ACTIONS ================= */}
        <div style={styles.actions}>
          <button type="button" onClick={onClose} style={styles.cancel}>Cancel</button>
          <button type="submit" style={styles.save}>
            {initialData ? "Update Offer" : "Save Offer"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ================= PARAM BUILDER ================= */
const ParamBuilder = ({ label, values = [], onChange }) => {
  const [input, setInput] = useState("");

  const add = (v) => {
    if (!v || values.includes(v)) return;
    onChange([...values, v]);
  };

  return (
    <div style={styles.inputGroup}>
      <label style={styles.label}>{label}</label>
      <div style={styles.chips}>
        {values.map((p) => (
          <span key={p} style={styles.chip} onClick={() => onChange(values.filter((x) => x !== p))}>
            {p} ✕
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(input.trim());
              setInput("");
            }
          }}
          placeholder="type & press enter"
          style={styles.chipInput}
        />
      </div>
    </div>
  );
};

/* ================= HELPERS ================= */
const toArray = (v) =>
  Array.isArray(v) ? v : typeof v === "string" ? v.split(",").map((x) => x.trim()) : [];

/* ================= UI ================= */
const Section = ({ title, children }) => (
  <div style={styles.section}>
    <h4 style={styles.sectionTitle}>{title}</h4>
    {children}
  </div>
);

const Input = ({ label, ...p }) => (
  <div style={styles.inputGroup}>
    <label style={styles.label}>{label}</label>
    <input {...p} style={styles.input} />
  </div>
);

const Select = ({ label, options, ...p }) => (
  <div style={styles.inputGroup}>
    <label style={styles.label}>{label}</label>
    <select {...p} style={styles.select}>
      <option value="">Select</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.name}</option>
      ))}
    </select>
  </div>
);

const Checkbox = ({ label, ...p }) => (
  <label style={styles.checkbox}>
    <input type="checkbox" {...p} /> {label}
  </label>
);

const Row = ({ children }) => <div style={styles.row}>{children}</div>;

/* ================= STYLES ================= */
const styles = {
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",justifyContent:"center",alignItems:"center",zIndex:50},
  card:{width:760,maxHeight:"90vh",overflowY:"auto",background:"#020617",padding:28,borderRadius:14,color:"#fff"},
  heading:{textAlign:"center",marginBottom:20},
  section:{marginBottom:20},
  sectionTitle:{color:"#38bdf8",fontSize:14,marginBottom:10},
  inputGroup:{marginBottom:10},
  label:{fontSize:12,color:"#94a3b8",marginBottom:4},
  input:{padding:10,borderRadius:8,border:"1px solid #1e293b",background:"#020617",color:"#fff"},
  select:{padding:10,borderRadius:8,border:"1px solid #1e293b",background:"#020617",color:"#fff"},
  row:{display:"flex",gap:12},
  checkbox:{display:"flex",gap:8,alignItems:"center"},
  actions:{display:"flex",justifyContent:"space-between"},
  cancel:{background:"#334155",padding:"10px 18px",borderRadius:8,color:"#fff"},
  save:{background:"#16a34a",padding:"10px 18px",borderRadius:8,color:"#fff"},
  chips:{display:"flex",flexWrap:"wrap",gap:6,border:"1px solid #1e293b",padding:6,borderRadius:8},
  chip:{background:"#1e293b",padding:"4px 8px",borderRadius:6,fontSize:12,cursor:"pointer"},
  chipInput:{flex:1,minWidth:120,background:"transparent",border:"none",color:"#fff",outline:"none"},
};
