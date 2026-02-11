import pool from "../db.js";
import { buildFeatures } from "./featureBuilder.js";
import { scoreAdvertiser } from "./scoringEngine.js";

/*
  WEIGHT CONFIG
*/
const FEATURE_WEIGHT = 0.6;
const PERFORMANCE_WEIGHT = 0.4;

/*
  ===============================
  PERFORMANCE STATS (ML MEMORY)
  ===============================
*/
async function getAdvertiserPerformance(advertiserId) {

  const res = await pool.query(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN success THEN 1 ELSE 0 END) AS success_count,
      AVG(latency_ms) AS avg_latency
    FROM advertiser_metrics
    WHERE advertiser_id = $1
      AND created_at > NOW() - INTERVAL '24 hours'
  `,[advertiserId]);

  const row = res.rows[0];

  const total = Number(row.total || 0);
  const successCount = Number(row.success_count || 0);
  const latency = Number(row.avg_latency || 1000);

  return {
    successRate: total > 0 ? successCount / total : 0.5, // cold start safe
    latency
  };
}

/*
  ===============================
  PERFORMANCE SCORE
  ===============================
*/
function calculatePerformanceScore(perf) {

  const successScore = perf.successRate;

  // Lower latency → higher score
  const latencyScore = 1 / Math.max(perf.latency, 1);

  return successScore * 0.7 + latencyScore * 0.3;
}

/*
  ===============================
  FETCH OFFER ADVERTISERS
  ===============================
*/
async function getOfferAdvertisers(offerId) {

  const res = await pool.query(`
    SELECT a.*
    FROM advertisers a
    JOIN offers o ON o.advertiser_id = a.id
    WHERE o.id = $1
      AND a.status = 'active'
  `,[offerId]);

  return res.rows;
}

/*
  =================================================
  🧠 MAIN AI ROUTER
  =================================================
*/
export async function chooseBestAdvertiser(offer, session) {

  /*
    STEP 1 → Get valid advertisers for offer
  */
  const advertisers = await getOfferAdvertisers(offer.id);

  if (!advertisers.length) return null;

  /*
    STEP 2 → Build session features
  */
  const features = buildFeatures(session, offer);

  let bestAdvertiser = null;
  let bestScore = -1;

  /*
    STEP 3 → Score each advertiser
  */
  for (const adv of advertisers) {

    /*
      FEATURE AI SCORE
    */
    const featureScore = await scoreAdvertiser(adv, features);

    /*
      PERFORMANCE ML SCORE
    */
    const perf = await getAdvertiserPerformance(adv.id);
    const performanceScore = calculatePerformanceScore(perf);

    /*
      FINAL HYBRID SCORE
    */
    const finalScore =
      featureScore * FEATURE_WEIGHT +
      performanceScore * PERFORMANCE_WEIGHT;

    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestAdvertiser = adv;
    }
  }

  return bestAdvertiser;
}
