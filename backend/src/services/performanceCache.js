import pool from "../db.js";

const cache = new Map();
const CACHE_TTL = 60 * 1000; // 1 min

export async function getAdvertiserStats(advertiserId) {

  const cached = cache.get(advertiserId);

  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const res = await pool.query(`
    SELECT
      success_rate,
      avg_latency
    FROM advertiser_metrics
    WHERE advertiser_id = $1
  `, [advertiserId]);

  const stats = res.rows[0] || {
    success_rate: 0.5,
    avg_latency: 1
  };

  cache.set(advertiserId, {
    data: stats,
    expiry: Date.now() + CACHE_TTL
  });

  return stats;
}
