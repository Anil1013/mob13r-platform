import { getAdvertiserStats } from "./performanceCache.js";

export async function scoreAdvertiser(advertiser, features) {

  const stats = await getAdvertiserStats(advertiser.id);

  /* ✅ FIXED COLUMN NAMES */
  const successScore = Number(stats.success_rate || 0);
  const latency = Number(stats.avg_latency || 1);

  const speedScore = 1 / latency;

  const geoBoost =
    advertiser.geo === features.geo ? 0.2 : 0;

  return (
      successScore * 0.5
    + speedScore * 0.3
    + geoBoost
  );
}
