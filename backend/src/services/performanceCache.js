import pool from "../db.js";

export async function getAdvertiserStats(advertiserId) {

  const res = await pool.query(`
    SELECT
      AVG(success_rate) as success,
      AVG(avg_latency) as latency
    FROM advertiser_metrics
    WHERE advertiser_id = $1
  `,[advertiserId]);

  return res.rows[0];
}
