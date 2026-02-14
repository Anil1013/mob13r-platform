import pool from "../db.js";

export async function logMetrics({ advertiser, status, latency }) {

  if (!advertiser) return;

  const isSuccess = status === "SUCCESS";

  await pool.query(
    `
    INSERT INTO advertiser_metrics (
      advertiser_id,
      total_success,
      total_fail,
      success_rate,
      avg_latency,
      last_updated
    )
    VALUES (
      $1::uuid,
      $2,
      $3,
      $4,
      $5,
      NOW()
    )
    ON CONFLICT (advertiser_id)
    DO UPDATE SET
      total_success = advertiser_metrics.total_success + EXCLUDED.total_success,
      total_fail = advertiser_metrics.total_fail + EXCLUDED.total_fail,
      success_rate =
        (advertiser_metrics.total_success + EXCLUDED.total_success)::float
        /
        NULLIF(
          advertiser_metrics.total_success
          + advertiser_metrics.total_fail
          + EXCLUDED.total_success
          + EXCLUDED.total_fail,
          0
        ),
      avg_latency =
        (advertiser_metrics.avg_latency + EXCLUDED.avg_latency) / 2,
      last_updated = NOW()
    `,
    [
      advertiser,                // UUID
      isSuccess ? 1 : 0,
      isSuccess ? 0 : 1,
      isSuccess ? 1 : 0,
      latency || 0
    ]
  );
}
