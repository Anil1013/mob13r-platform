export function buildFeatures(session = {}, offer = {}) {

  const msisdn = String(session.msisdn || "");

  return {
    geo: session.geo || null,
    carrier: session.carrier || null,
    hour: new Date().getHours(),
    msisdn_prefix: msisdn.substring(0, 4),
    offer_id: offer.id || null
  };
}
