import pool from "../db.js";

/* ================= GET TODAY HITS ================= */
export const getTodayHits = async (offerId) => {
  const { rows } = await pool.query(
    `
    SELECT hits FROM offer_daily_stats
    WHERE offer_id = $1 AND hit_date = CURRENT_DATE
    `,
    [offerId]
  );

  return rows[0]?.hits || 0;
};

/* ================= INCREMENT HIT ================= */
export const incrementHit = async (offerId) => {
  await pool.query(
    `
    INSERT INTO offer_daily_stats (offer_id, hit_date, hits)
    VALUES ($1, CURRENT_DATE, 1)
    ON CONFLICT (offer_id, hit_date)
    DO UPDATE SET hits = offer_daily_stats.hits + 1
    `,
    [offerId]
  );
};

/* ================= CAP CHECK ================= */
export const isCapReached = async (offer) => {
  if (!offer.daily_cap || offer.daily_cap <= 0) return false;

  const hits = await getTodayHits(offer.id);
  return hits >= offer.daily_cap;
};
