import pool from "../db.js";

export async function getAdvertiserStats(advertiserId) {

  const res = await pool.query(
    `
    SELECT
      success_rate,
      avg_latency,
      total_success,
      total_fail
    FROM advertiser_metrics
    WHERE advertiser_id = $1
    `,
    [advertiserId]
  );

  if (!res.rows.length) {
    return {
      success_rate: 0,
      avg_latency: 1,
      total_success: 0,
      total_fail: 0
    };
  }

  return res.rows[0];
}
