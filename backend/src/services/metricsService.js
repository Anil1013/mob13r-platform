import pool from "../db.js";

export async function logMetrics({ advertiser, latency, status }) {

  if (!advertiser) return;

  await pool.query(`
    INSERT INTO advertiser_metrics
    (advertiser_id, success, latency_ms)
    VALUES ($1,$2,$3)
  `,[
    advertiser,
    status === "SUCCESS" || status === "OTP_SENT",
    latency
  ]);
}
