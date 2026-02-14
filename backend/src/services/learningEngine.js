import pool from "../db.js";

export async function learnFromResult(advertiserId, success, latency) {

  if (!advertiserId) return;

  await pool.query(
    `
    UPDATE advertiser_metrics
    SET
      total_success = total_success + $1,
      total_fail = total_fail + $2,
      avg_latency =
        CASE 
          WHEN avg_latency = 0 THEN $3
          ELSE (avg_latency + $3) / 2
        END,
      success_rate =
        CASE
          WHEN (total_success + total_fail + 1) = 0 THEN 0
          ELSE 
            (total_success + $1)::float /
            (total_success + total_fail + 1)
        END,
      last_updated = NOW()
    WHERE advertiser_id = $4::uuid
    `,
    [
      success ? 1 : 0,
      success ? 0 : 1,
      latency,
      advertiserId
    ]
  );
}
