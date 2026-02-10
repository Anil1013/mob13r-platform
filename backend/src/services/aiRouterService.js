import pool from "../db.js";
import { buildFeatures } from "./featureBuilder.js";
import { scoreAdvertiser } from "./scoringEngine.js";

export async function chooseBestAdvertiser(offer, session) {

  const advertisers = await pool.query(`
    SELECT *
    FROM advertisers
    WHERE status='active'
  `);

  const features = buildFeatures(session, offer);

  let best = null;
  let bestScore = -1;

  for (const adv of advertisers.rows) {

    const score = await scoreAdvertiser(adv, features);

    if (score > bestScore) {
      bestScore = score;
      best = adv;
    }
  }

  return best;
}
