/* ===========================================================
   CLICK ROTATION + CLICK LOGGING (FIXED FOR ANALYTICS)
=========================================================== */
router.get("/click", fraudCheck, async (req, res) => {
  try {
    const { pub_id, geo, carrier, click_id } = req.query;

    if (!pub_id || !geo || !carrier) {
      return res.status(400).send("missing params");
    }

    // Fetch rules
    const q = `
      SELECT *
      FROM traffic_rules
      WHERE pub_id = $1 AND status = 'active'
    `;
    const { rows } = await pool.query(q, [pub_id]);

    if (!rows.length) return res.redirect("https://google.com");

    const filtered = rows.filter((r) => {
      const geos = (r.geo || "").split(",").map(v => v.trim().toUpperCase());
      const carriers = (r.carrier || "").split(",").map(v => v.trim().toUpperCase());

      return geos.includes(geo.toUpperCase()) &&
             carriers.includes(carrier.toUpperCase());
    });

    if (!filtered.length) return res.redirect("https://google.com");

    // Weighted rotation
    let selected = filtered[0];
    let total = filtered.reduce((a, r) => a + Number(r.weight), 0);
    let rnd = Math.random() * total;

    for (const rule of filtered) {
      rnd -= Number(rule.weight);
      if (rnd <= 0) {
        selected = rule;
        break;
      }
    }

    /* ======================================================
       GET EXTRA DATA (Publisher + Offer Names)
    ====================================================== */

    const publisherRes = await pool.query(
      `SELECT name FROM publishers WHERE pub_code = $1 LIMIT 1`,
      [pub_id]
    );

    const publisher_name =
      publisherRes.rows[0]?.name || null;

    const offerRes = await pool.query(
      `SELECT name, advertiser_name 
       FROM offers 
       WHERE id = $1 LIMIT 1`,
      [selected.offer_id]
    );

    const offer_name = offerRes.rows[0]?.name || null;
    const advertiser_name = offerRes.rows[0]?.advertiser_name || null;


    /* ======================================================
       FIXED → Insert exact analytics fields (ALL COLUMNS)
    ====================================================== */

    await pool.query(
      `INSERT INTO analytics_clicks 
       (pub_id, publisher_name, offer_id, offer_name, advertiser_name,
        geo, carrier, ip_address, user_agent, referer, params)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        pub_id,
        publisher_name,
        selected.offer_id,
        offer_name,
        advertiser_name,
        geo,
        carrier,
        req.ip,
        req.headers["user-agent"],
        req.headers["referer"] || null,
        JSON.stringify(req.query)
      ]
    );

    /* ======================================================
       REDIRECT WITH CLICK_ID
    ====================================================== */
    let finalUrl = selected.redirect_url;

    if (click_id) {
      finalUrl += (finalUrl.includes("?") ? "&" : "?") + `click_id=${click_id}`;
    }

    return res.redirect(finalUrl);

  } catch (err) {
    console.error("CLICK ERROR:", err);
    return res.redirect("https://google.com");
  }
});
