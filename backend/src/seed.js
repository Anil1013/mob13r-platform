import pool from "./db.js";
import bcrypt from "bcrypt";

async function seed() {
  try {
    console.log("🌱 Starting database seed...");

    // ✅ Create default admin key if none exists
    const checkAdmin = await pool.query(
      "SELECT id FROM admin_keys LIMIT 1"
    );

    if (checkAdmin.rowCount === 0) {
      const defaultKey = "Admin@123"; // temporary master key
      const hash = await bcrypt.hash(defaultKey, 10);

      await pool.query(
        `INSERT INTO admin_keys (api_key) VALUES ($1)`,
        [hash]
      );

      console.log("✅ Default Admin API Key created:");
      console.log("🔑 Key:", defaultKey);
      console.log("⚠️ Change it after first login!");
    } else {
      console.log("✅ Admin key already exists — skipping admin seed");
    }

    // ✅ Publishers
    await pool.query(`
      INSERT INTO publishers (name, website)
      VALUES
      ('Publisher One', 'https://pub1.com'),
      ('Publisher Two', 'https://pub2.com'),
      ('Affiliate Hub', 'https://affiliatehub.com')
      ON CONFLICT DO NOTHING;
    `);

    // ✅ Advertisers
    await pool.query(`
      INSERT INTO advertisers (name, website)
      VALUES
      ('Advertiser A', 'https://advA.com'),
      ('Advertiser B', 'https://advB.com')
      ON CONFLICT DO NOTHING;
    `);

    // ✅ Offers
    await pool.query(`
      INSERT INTO offers (name, payout, url)
      VALUES
      ('Offer Alpha', 2.50, 'https://offer-alpha.com'),
      ('Offer Beta', 1.75, 'https://offer-beta.com'),
      ('Offer Gamma', 3.00, 'https://offer-gamma.com')
      ON CONFLICT DO NOTHING;
    `);

    // ✅ Clicks
    await pool.query(`
      INSERT INTO clicks (publisher_id, offer_id, ip)
      VALUES
      (1, 1, '127.0.0.1'),
      (2, 2, '127.0.0.1')
      ON CONFLICT DO NOTHING;
    `);

    // ✅ Conversions
    await pool.query(`
      INSERT INTO conversions (click_id, payout)
      VALUES
      (1, 2.50),
      (2, 1.75)
      ON CONFLICT DO NOTHING;
    `);

    console.log("✅ Database seed completed!");

  } catch (err) {
    console.error("❌ Seed Error:", err);
  }
}

seed();
