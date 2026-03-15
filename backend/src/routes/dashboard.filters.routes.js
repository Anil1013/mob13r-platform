import express from "express";
import pool from "../db.js";

const router = express.Router();

router.get("/dashboard/filters", async (req, res) => {

 try {

  /* ADVERTISERS */

  const advertisers = await pool.query(`
  SELECT id, advertiser_name
  FROM advertisers
  ORDER BY advertiser_name
  `);

  /* PUBLISHERS */

  const publishers = await pool.query(`
  SELECT id, name
  FROM publishers
  ORDER BY name
  `);

  /* GEO */

  const geos = await pool.query(`
  SELECT DISTINCT geo
  FROM pin_sessions
  WHERE geo IS NOT NULL
  ORDER BY geo
  `);

  /* CARRIER */

  const carriers = await pool.query(`
  SELECT DISTINCT carrier
  FROM pin_sessions
  WHERE carrier IS NOT NULL
  ORDER BY carrier
  `);

  /* OFFERS */

  const offers = await pool.query(`
  SELECT id, service_name
  FROM offers
  WHERE status='active'
  ORDER BY service_name
  `);

  res.json({

   advertisers: advertisers.rows.map(a => ({
     id: a.id,
     name: a.advertiser_name
   })),

   publishers: publishers.rows.map(p => ({
     id: p.id,
     name: p.name
   })),

   geos: geos.rows.map(g => g.geo),

   carriers: carriers.rows.map(c => c.carrier),

   offers: offers.rows.map(o => ({
     id: o.id,
     offer_name: o.service_name
   }))

  });

 } catch (err) {

  console.error("FILTER API ERROR:", err);

  res.status(500).json({ status: "FAILED" });

 }

});

export default router;
