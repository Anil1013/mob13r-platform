export function buildFeatures(session, offer) {

  return {
    geo: session.geo,
    carrier: session.carrier,
    hour: new Date().getHours(),
    msisdn_prefix: session.msisdn.slice(0, 4),
    offer_id: offer.id
  };
}
