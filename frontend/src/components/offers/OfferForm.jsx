export default function OfferForm({ onClose }) {
  return (
    <div style={styles.modal}>
      <h3>Create / Edit Offer</h3>

      <input placeholder="Offer Name" />
      <input placeholder="Advertiser" />
      <input placeholder="Geo (Kuwait)" />
      <input placeholder="Carrier (Zain)" />
      <input placeholder="Plan (Daily / Weekly / Monthly)" />
      <input placeholder="Payout" />
      <input placeholder="Revenue" />

      <label>
        <input type="checkbox" /> Enable Anti-Fraud
      </label>

      <textarea placeholder="API Documentation / Parameters" rows={5} />

      <div>
        <button>Save Offer</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

const styles = {
  modal: {
    background: "#020617",
    border: "1px solid #1e293b",
    padding: 20,
    borderRadius: 12,
    marginTop: 24,
  },
};
