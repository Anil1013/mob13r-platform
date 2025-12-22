import { useEffect, useState } from "react";
import { getAdvertisers } from "../../services/advertisers";

export default function OfferForm({ onClose, onSave }) {
  const [advertisers, setAdvertisers] = useState([]);

  const [offer, setOffer] = useState({
    name: "",
    advertiser_id: "",
    geo: "",
    carrier: "",
    payout: "",
    revenue: "",
    apiMode: "POST",

    pinSendUrl: "",
    pinSendParams: "",

    pinVerifyUrl: "",
    pinVerifyParams: "",

    statusCheckUrl: "",

    fraudEnabled: false,
    fraudPartner: "",
    fraudService: "",
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
      pinSendParams: offer.pinSendParams
        ? offer.pinSendParams.split(",").map((p) => p.trim())
        : [],
      pinVerifyParams: offer.pinVerifyParams
        ? offer.pinVerifyParams.split(",").map((p) => p.trim())
        : [],
    });
  };

  return (
    <div style={styles.overlay}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h2 style={styles.heading}>Create Offer</h2>

        {/* BASIC INFO */}
        <Section title="Basic Information">
          <Input
            label="Offer Name"
            name="name"
            value={offer.name}
            onChange={handleChange}
            required
          />

          {/* ADVERTISER DROPDOWN */}
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
            <Input
              label="Carrier"
              name="carrier"
              value={offer.carrier}
              onChange={handleChange}
            />
          </Row>

          <Row>
            <Input
              label="Payout"
              name="payout"
              value={offer.payout}
              onChange={handleChange}
            />
            <Input
              label="Revenue"
              name="revenue"
              value={offer.revenue}
              onChange={handleChange}
            />
          </Row>
        </Section>

        {/* API MODE */}
        <Section title="API Mode">
          <select
            name="apiMode"
            value={offer.apiMode}
            onChange={handleChange}
            style={styles.select}
          >
            <option value="POST">POST</option>
            <option value="GET">GET</option>
          </select>
        </Section>

        {/* PIN SEND */}
        <Section title="PIN Send API">
          <Input
            label="PIN Send URL"
            name="pinSendUrl"
            value={offer.pinSendUrl}
            onChange={handleChange}
          />
          <Input
            label="Parameters (comma separated)"
            name="pinSendParams"
            placeholder="msisdn,token,cycle,pixel"
            value={offer.pinSendParams}
            onChange={handleChange}
          />
        </Section>

        {/* PIN VERIFY */}
        <Section title="PIN Verify API">
          <Input
            label="PIN Verify URL"
            name="pinVerifyUrl"
            value={offer.pinVerifyUrl}
            onChange={handleChange}
          />
          <Input
            label="Parameters (comma separated)"
            name="pinVerifyParams"
            placeholder="msisdn,pin,token"
            value={offer.pinVerifyParams}
            onChange={handleChange}
          />
        </Section>

        {/* STATUS */}
        <Section title="Status Check API">
          <Input
            label="Status Check URL"
            name="statusCheckUrl"
            value={offer.statusCheckUrl}
            onChange={handleChange}
          />
        </Section>

        {/* FRAUD */}
        <Section title="Anti-Fraud (Optional)">
          <label style={styles.checkbox}>
            <input
              type="checkbox"
              name="fraudEnabled"
              checked={offer.fraudEnabled}
              onChange={handleChange}
            />
            Enable Fraud Protection
          </label>

          {offer.fraudEnabled && (
            <>
              <Input
                label="Fraud Partner ID"
                name="fraudPartner"
                value={offer.fraudPartner}
                onChange={handleChange}
              />
              <Input
                label="Fraud Service ID"
                name="fraudService"
                value={offer.fraudService}
                onChange={handleChange}
              />
            </>
          )}
        </Section>

        {/* ACTIONS */}
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

/* ================= STYLES (UNCHANGED) ================= */

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
