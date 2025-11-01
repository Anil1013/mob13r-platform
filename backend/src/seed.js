import pool from "./db.js";
import bcrypt from "bcryptjs";

async function seed() {
  try {
    console.log("🌱 Starting database seed...");

    // ✅ Create default admin user
    const adminUser = await pool.query("SELECT id FROM users WHERE username='admin'");

    if (adminUser.rowCount === 0) {
      const password = "Mob13r@123";
      const hash = await bcrypt.hash(password, 10);

      await pool.query(
        `INSERT INTO users (username, email, role, password_hash)
         VALUES ('admin', 'admin@mob13r.com', 'admin', $1)`,
        [hash]
      );

      console.log("✅ Default Admin user created");
      console.log("👤 Username: admin");
      console.log("🔑 Password:", password);
    } else {
      console.log("✅ Admin user already exists — skipping user seed");
    }

    // ✅ Create admin API key (not login password — ignore)
    const checkAdminKey = await pool.query("SELECT id FROM admin_keys LIMIT 1");
    if (checkAdminKey.rowCount === 0) {
      const defaultKey = "Admin@123"; 
      await pool.query(`INSERT INTO admin_keys (api_key) VALUES ($1)`, [defaultKey]);
      console.log("🔑 Admin API Key:", defaultKey);
    }

    // ✅ Publishers
    await pool.query(`
      INSERT INTO publishers (name, website) VALUES
      ('Publisher One', 'https://pub1.com'),
      ('Publisher Two', 'https://pub2.com'),
      ('Affiliate Hub', 'https://affiliatehub.com')
      ON CONFLICT DO NOTHING;
    `);

    // ✅ Advertisers
    await pool.query(`
      INSERT INTO advertisers (name, website) VALUES
      ('Advertiser A', 'https://advA.com'),
      ('Advertiser B', 'https://advB.com')
      ON CONFLICT DO NOTHING;
    `);

    // ✅ Offers
    await pool.query(`
      INSERT INTO offers (name, payout, url) VALUES
      ('Offer Alpha', 2.50, 'https://offer-alpha.com'),
      ('Offer Beta', 1.75, 'https://offer-beta.com'),
      ('Offer Gamma', 3.00, 'https://offer-gamma.com')
      ON CONFLICT DO NOTHING;
    `);

    console.log("✅ Seed Completed!");

  } catch (err) {
    console.error("❌ Seed Error:", err);
  }
}

seed();
