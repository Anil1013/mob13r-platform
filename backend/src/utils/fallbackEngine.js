import pool from "../db.js";

/* ================= FIND FALLBACK OFFER ================= */
export const findFallbackOffer = async (offer) => {
  // explicit fallback first
  if (offer.fallback_offer_id) {
    const { rows } = await pool.query(
      `SELECT * FROM offers WHERE id = $1 AND is_active = true`,
      [offer.fallback_offer_id]
    );
    if (rows[0]) return rows[0];
  }

  // auto fallback by geo + carrier
  const { rows } = await pool.query(
    `
    SELECT * FROM offers
    WHERE
      geo = $1
      AND carrier = $2
      AND is_active = true
      AND id != $3
    ORDER BY payout DESC
    LIMIT 1
    `,
    [offer.geo, offer.carrier, offer.id]
  );

  return rows[0] || null;
};
