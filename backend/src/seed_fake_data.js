import pool from "./db.js";

async function seedFake() {
  console.log("🌱 Seeding Sample Data...");

  // ✅ Publishers
  await pool.query(`
    INSERT INTO publishers (name, website)
    VALUES 
    ('Publisher One', 'https://pub1.com'),
    ('Publisher Two', 'https://pub2.com'),
    ('LeadTraffic', 'https://leadtraffic.com')
    ON CONFLICT DO NOTHING;
  `);

  // ✅ Advertisers
  await pool.query(`
    INSERT INTO advertisers (name, website)
    VALUES 
    ('OfferGate Media', 'https://offergate.com'),
    ('AdFlex Corp', 'https://adflex.io')
    ON CONFLICT DO NOTHING;
  `);

  // ✅ Offers
  await pool.query(`
    INSERT INTO offers (name, payout, url)
    VALUES
    ('iPhone Lead Submit', 2.50, 'https://lp-iphone.com'),
    ('Win Macbook', 1.80, 'https://winmac.io'),
    ('Crypto Signup', 4.20, 'https://crypto-sign.com')
    ON CONFLICT DO NOTHING;
  `);

  console.log("✅ Fake data inserted!");
  process.exit();
}

seedFake();
