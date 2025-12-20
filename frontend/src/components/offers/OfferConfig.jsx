export default function OfferConfig({ offer, onClose }) {
  return (
    <div style={{ marginTop: 24 }}>
      <h3>Offer Execution Flow – {offer.name}</h3>

      <ul>
        <li>1️⃣ Pin Send API</li>
        <li>2️⃣ Pin Verify API</li>
        <li>3️⃣ Status Check API</li>
        <li>4️⃣ Portal Redirect</li>
        <li>5️⃣ Anti-Fraud Validation (if enabled)</li>
      </ul>

      <button onClick={onClose}>Close</button>
    </div>
  );
}
