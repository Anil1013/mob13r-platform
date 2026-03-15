import express from "express";
import pool from "../db.js";

const router = express.Router();

/*
=====================================================
DASHBOARD FILTER LIST
=====================================================
*/

router.get("/dashboard/filters", async (req, res) => {

 try {

  /* ADVERTISERS */

  const advertisers = await pool.query(`
  SELECT DISTINCT advertiser_name
  FROM advertisers
  ORDER BY advertiser_name
  `);

  /* PUBLISHERS */

  const publishers = await pool.query(`
  SELECT DISTINCT publisher_name
  FROM publishers
  ORDER BY publisher_name
  `);

  /* GEO */

  const geos = await pool.query(`
  SELECT DISTINCT geo
  FROM pin_sessions
  WHERE geo IS NOT NULL
  ORDER BY geo
  `);

  /* CARRIERS */

  const carriers = await pool.query(`
  SELECT DISTINCT carrier
  FROM pin_sessions
  WHERE carrier IS NOT NULL
  ORDER BY carrier
  `);

  /* OFFERS */

  const offers = await pool.query(`
  SELECT id, offer_name
  FROM offers
  WHERE status='active'
  ORDER BY offer_name
  `);

  res.json({

   advertisers: advertisers.rows.map(r => r.advertiser_name),

   publishers: publishers.rows.map(r => r.publisher_name),

   geos: geos.rows.map(r => r.geo),

   carriers: carriers.rows.map(r => r.carrier),

   offers: offers.rows

  });

 } catch (err) {

  console.error("FILTER API ERROR:", err);

  res.status(500).json({
   status: "FAILED"
  });

 }

});

export default router;
