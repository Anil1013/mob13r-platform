import pool from "../db.js";
import { buildFeatures } from "./featureBuilder.js";
import { scoreAdvertiser } from "./scoringEngine.js";

export async function chooseBestAdvertiser(offer, session) {

  try {

    const advertisers = await pool.query(`
      SELECT *
      FROM advertisers
      WHERE status='active'
    `);

    if (!advertisers.rows.length) return null;

    const features = buildFeatures(session, offer);

    let best = null;
    let bestScore = -999;

    for (const adv of advertisers.rows) {

      try {

        const score = await scoreAdvertiser(adv, features);

        if (score > bestScore) {
          bestScore = score;
          best = adv;
        }

      } catch (err) {
        console.error("Scoring error:", err.message);
      }
    }

    return best;

  } catch (err) {
    console.error("AI Router error:", err.message);
    return null;
  }
}
