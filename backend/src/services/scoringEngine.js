import { getAdvertiserStats } from "./performanceCache.js";

/**
 * ⭐ AI Advertiser Scoring Engine
 *
 * Score based on:
 *  - success_rate
 *  - latency
 *  - geo match
 *  - traffic behaviour
 */

export async function scoreAdvertiser(advertiser, features) {

  const stats = await getAdvertiserStats(advertiser.id);

  /* ================= SAFETY DEFAULTS ================= */

  const successScore = Number(stats?.success_rate || 0);

  // lower latency = better score
  const latency = Number(stats?.avg_latency || 1);
  const speedScore = 1 / latency;

  /* ================= GEO BOOST ================= */

  const geoBoost =
    advertiser.geo === features.geo ? 0.2 : 0;

  /* ================= FINAL SCORE ================= */

  return (
      successScore * 0.5
    + speedScore * 0.3
    + geoBoost
  );
}
