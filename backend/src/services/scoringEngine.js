import { getAdvertiserStats } from "./performanceCache.js";

export async function scoreAdvertiser(advertiser, features) {

  if (!advertiser) return 0;

  const stats = await getAdvertiserStats(advertiser.id);

  /* ===== PERFORMANCE SCORES ===== */
  const successScore = Number(stats?.success_rate || 0);
  const latency = Number(stats?.avg_latency || 1);
  const speedScore = latency > 0 ? 1 / latency : 0;

  /* ===== GEO MATCH BOOST ===== */
  const geoBoost =
    advertiser.geo && advertiser.geo === features.geo ? 0.2 : 0;

  /* ===== FINAL AI SCORE ===== */
  return (
      successScore * 0.5
    + speedScore * 0.3
    + geoBoost
  );
}
