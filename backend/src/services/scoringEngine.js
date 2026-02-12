import { getAdvertiserStats } from "./performanceCache.js";

export async function scoreAdvertiser(advertiser, features) {

  const stats = await getAdvertiserStats(advertiser.id);

  const successScore = Number(stats.success || 0);
  const latency = Number(stats.latency || 1);

  const speedScore = 1 / latency;

  const geoBoost =
    advertiser.geo === features.geo ? 0.2 : 0;

  return (
    successScore * 0.5 +
    speedScore * 0.3 +
    geoBoost
  );
}
