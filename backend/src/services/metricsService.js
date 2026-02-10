import pool from "../db.js";

export async function logMetrics(m) {
  await pool.query(
    `INSERT INTO router_metrics(route,latency,status,advertiser_id)
     VALUES ($1,$2,$3,$4)`,
    [m.route, m.latency, m.status, m.advertiser]
  );
}
