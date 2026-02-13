import pool from "../db.js";

export async function learnFromResult(advertiserId, success, latency) {

  await pool.query(`
    INSERT INTO advertiser_metrics
      (advertiser_id, total_success, total_fail, avg_latency)
    VALUES ($1,$2,$3,$4)
    ON CONFLICT (advertiser_id)
    DO UPDATE SET
      total_success = advertiser_metrics.total_success + $2,
      total_fail = advertiser_metrics.total_fail + $3,
      avg_latency =
        (advertiser_metrics.avg_latency + $4) / 2,
      success_rate =
        CASE
          WHEN (advertiser_metrics.total_success + advertiser_metrics.total_fail + 1) = 0
          THEN 0
          ELSE
            (advertiser_metrics.total_success + $2)::float /
            (advertiser_metrics.total_success + advertiser_metrics.total_fail + 1)
        END
  `,
  [
    advertiserId,
    success ? 1 : 0,
    success ? 0 : 1,
    latency || 0
  ]);
}
