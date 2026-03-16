router.get("/dashboard/filters", async(req,res)=>{

 const advertisers = await pool.query(`
 SELECT id,name FROM advertisers
 ORDER BY name
 `);

 const publishers = await pool.query(`
 SELECT id,name FROM publishers
 ORDER BY name
 `);

 const offers = await pool.query(`
 SELECT id,service_name
 FROM offers
 WHERE status='active'
 `);

 const geos = await pool.query(`
 SELECT DISTINCT params->>'geo' AS geo
 FROM pin_sessions
 WHERE params->>'geo' IS NOT NULL
 `);

 const carriers = await pool.query(`
 SELECT DISTINCT params->>'carrier' AS carrier
 FROM pin_sessions
 WHERE params->>'carrier' IS NOT NULL
 `);

 res.json({

 advertisers: advertisers.rows,
 publishers: publishers.rows,
 offers: offers.rows,
 geos: geos.rows.map(g=>g.geo),
 carriers: carriers.rows.map(c=>c.carrier)

 });

});
