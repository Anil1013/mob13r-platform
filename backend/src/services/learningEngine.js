import pool from "../db.js";

export async function learnFromResult(advertiserId, success, latency) {

  await pool.query(`
    INSERT INTO advertiser_metrics
    (advertiser_id, success_rate, avg_latency)
    VALUES ($1,$2,$3)
  `,[advertiserId, success ? 1 : 0, latency]);
}
