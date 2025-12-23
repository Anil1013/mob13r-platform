import { useEffect, useState } from "react";
import { getAdvertisers } from "../../services/advertisers";

export default function OfferForm({ onClose, onSave }) {
  const [advertisers, setAdvertisers] = useState([]);

  const [offer, setOffer] = useState({
    /* ================= BASIC ================= */
    name: "",
    advertiser_id: "",
    geo: "",
    carrier: "",
    payout: "",
    revenue: "",

    /* ================= API ================= */
    api_mode: "POST",

    /* ================= STATUS CHECK ================= */
    status_check_url: "",
    status_check_params: "msisdn,transaction_id",

    /* ================= PIN SEND ================= */
    pin_send_url: "",
    pin_send_params: "msisdn,transaction_id",

    /* ================= PIN VERIFY ================= */
    pin_verify_url: "",
    pin_verify_params: "msisdn,pin,transaction_id",

    /* ================= FRAUD ================= */
    fraud_enabled: false,
    fraud_partner: "",
    fraud_service: "",
  });

  /* ================= LOAD ADVERTISERS ================= */
  useEffect(() => {
    const loadAdvertisers = async () => {
      const data = await getAdvertisers();
      setAdvertisers(data);
    };
    loadAdvertisers();
  }, []);

  /* ================= HANDLE CHANGE ================= */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setOffer({
      ...offer,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = (e) => {
    e.preventDefault();

    onSave({
      ...offer,
      payout: Number(offer.payout),
      revenue: Number(offer.revenue),

      status_check_params: normalize(offer.status_check_params),
      pin_send_params: normalize(offer.pin_send_params),
      pin_verify_params: normalize(offer.pin_verify_params),
    });
  };

  return (
    <div style={styles.overlay}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h2 style={styles.heading}>Create Offer</h2>

        {/* ================= BASIC INFO ================= */}
        <Section title="Basic Information">
          <Input
            label="Offer Name"
            name="name"
            value={offer.name}
            onChange={handleChange}
            required
          />

          {/* ADVERTISER */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Advertiser</label>
            <select
              name="advertiser_id"
              value={offer.advertiser_id}
              onChange={handleChange}
              style={styles.select}
              required
            >
              <option value="">Select advertiser</option>
              {advertisers.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <Row>
            <Input label="Geo" name="geo" value={offer.geo} onChange={handleChange} />
            <Input label="Carrier" name="carrier" value={offer.carrier} onChange={handleChange} />
          </Row>

          <Row>
            <Input label="Payout" name="payout" value={offer.payout} onChange={handleChange} />
            <Input label="Revenue" name="revenue" value={offer.revenue} onChange={handleChange} />
          </Row>
        </Section>

        {/* ================= API MODE ================= */}
        <Section title="API Mode">
          <select
            name="api_mode"
            value={offer.api_mode}
            onChange={handleChange}
            style={styles.select}
          >
            <option value="POST">POST</option>
            <option value="GET">GET</option>
          </select>
        </Section>

        {/* ================= STATUS CHECK ================= */}
        <Section title="Status Check API">
          <Input
            label="Status Check URL"
            name="status_check_url"
            value={offer.status_check_url}
            onChange={handleChange}
          />
          <Input
            label="Allowed Parameters (comma separated)"
            name="status_check_params"
            placeholder="msisdn,transaction_id"
            value={offer.status_check_params}
            onChange={handleChange}
          />
        </Section>

        {/* ================= PIN SEND ================= */}
        <Section title="PIN Send API">
          <Input
            label="PIN Send URL"
            name="pin_send_url"
            value={offer.pin_send_url}
            onChange={handleChange}
          />
          <Input
            label="Allowed Parameters (comma separated)"
            name="pin_send_params"
            placeholder="msisdn,transaction_id"
            value={offer.pin_send_params}
            onChange={handleChange}
          />
        </Section>

        {/* ================= PIN VERIFY ================= */}
        <Section title="PIN Verify API">
          <Input
            label="PIN Verify URL"
            name="pin_verify_url"
            value={offer.pin_verify_url}
            onChange={handleChange}
          />
          <Input
            label="Allowed Parameters (comma separated)"
            name="pin_verify_params"
            placeholder="msisdn,pin,transaction_id"
            value={offer.pin_verify_params}
            onChange={handleChange}
          />
        </Section>

        {/* ================= FRAUD ================= */}
        <Section title="Anti-Fraud (Optional)">
          <label style={styles.checkbox}>
            <input
              type="checkbox"
              name="fraud_enabled"
              checked={offer.fraud_enabled}
              onChange={handleChange}
            />
            Enable Fraud Protection
          </label>

          {offer.fraud_enabled && (
            <>
              <Input
                label="Fraud Partner ID"
                name="fraud_partner"
                value={offer.fraud_partner}
                onChange={handleChange}
              />
              <Input
                label="Fraud Service ID"
                name="fraud_service"
                value={offer.fraud_service}
                onChange={handleChange}
              />
            </>
          )}
        </Section>

        {/* ================= ACTIONS ================= */}
        <div style={styles.actions}>
          <button type="button" onClick={onClose} style={styles.cancel}>
            Cancel
          </button>
          <button type="submit" style={styles.save}>
            Save Offer
          </button>
        </div>
      </form>
    </div>
  );
}

/* ================= HELPERS ================= */

const normalize = (value) =>
  value
    ? value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : [];

/* ================= SMALL COMPONENTS ================= */

const Section = ({ title, children }) => (
  <div style={styles.section}>
    <h4 style={styles.sectionTitle}>{title}</h4>
    {children}
  </div>
);

const Input = ({ label, ...props }) => (
  <div style={styles.inputGroup}>
    <label style={styles.label}>{label}</label>
    <input {...props} style={styles.input} />
  </div>
);

const Row = ({ children }) => (
  <div style={styles.row}>{children}</div>
);

/* ================= STYLES ================= */

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 50,
  },
  card: {
    width: "720px",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#020617",
    padding: "28px",
    borderRadius: "14px",
    color: "#fff",
  },
  heading: {
    textAlign: "center",
    marginBottom: "20px",
  },
  section: {
    marginBottom: "20px",
  },
  sectionTitle: {
    marginBottom: "10px",
    color: "#38bdf8",
    fontSize: "14px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    marginBottom: "10px",
  },
  label: {
    fontSize: "12px",
    color: "#94a3b8",
    marginBottom: "4px",
  },
  input: {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #1e293b",
    background: "#020617",
    color: "#fff",
  },
  select: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    background: "#020617",
    color: "#fff",
    border: "1px solid #1e293b",
  },
  row: {
    display: "flex",
    gap: "12px",
  },
  checkbox: {
    display: "flex",
    gap: "8px",
    fontSize: "14px",
    alignItems: "center",
  },
  actions: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "20px",
  },
  cancel: {
    background: "#334155",
    padding: "10px 18px",
    borderRadius: "8px",
    border: "none",
    color: "#fff",
  },
  save: {
    background: "#16a34a",
    padding: "10px 18px",
    borderRadius: "8px",
    border: "none",
    color: "#fff",
  },
};
