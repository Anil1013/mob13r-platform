import pool from "./db.js";

async function seedFake() {
  console.log("🌱 Seeding Sample Data...");

  // ✅ Publishers
  await pool.query(
  `INSERT INTO publishers (name, email, status)
   VALUES ($1, $2, 'active')`,
  [Abc, 123ad@gmail.com]
);


  // ✅ Advertisers
  await pool.query(`
    INSERT INTO publishers (name, email, status)
   VALUES ($1, $2, 'active')`,
  [Abc, 123ad@gmail.com]
);

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
