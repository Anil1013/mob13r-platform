import pool from "./db.js";

async function seed() {
  try {
    console.log("🌱 Seeding database...");

    // Publishers
    await pool.query(`
      INSERT INTO publishers (name, website)
      VALUES
      ('Publisher One', 'https://pub1.com'),
      ('Publisher Two', 'https://pub2.com'),
      ('Affiliate Hub', 'https://affiliatehub.com')
      ON CONFLICT DO NOTHING;
    `);

    // Advertisers
    await pool.query(`
      INSERT INTO advertisers (name, website)
      VALUES
      ('Advertiser A', 'https://advA.com'),
      ('Advertiser B', 'https://advB.com')
      ON CONFLICT DO NOTHING;
    `);

    // Offers
    await pool.query(`
      INSERT INTO offers (name, payout, url)
      VALUES
      ('Offer Alpha', 2.50, 'https://offer-alpha.com'),
      ('Offer Beta', 1.75, 'https://offer-beta.com'),
      ('Offer Gamma', 3.00, 'https://offer-gamma.com')
      ON CONFLICT DO NOTHING;
    `);

    // Clicks
    await pool.query(`
      INSERT INTO clicks (publisher_id, offer_id, ip)
      VALUES
      (1, 1, '127.0.0.1'),
      (2, 2, '127.0.0.1')
      ON CONFLICT DO NOTHING;
    `);

    // Conversions
    await pool.query(`
      INSERT INTO conversions (click_id, payout)
      VALUES
      (1, 2.50),
      (2, 1.75)
      ON CONFLICT DO NOTHING;
    `);

    console.log("✅ Seed completed!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding error:", err);
    process.exit(1);
  }
}

seed();
