import pool from "./db.js";
import bcrypt from "bcryptjs";

async function seed() {
  try {
    console.log("Seeding admin user...");

    const check = await pool.query("SELECT id FROM users WHERE username=$1", ["admin"]);

    if (check.rowCount === 0) {
      const password = "Mob13r@123";
      const hash = await bcrypt.hash(password, 10);

      await pool.query(
        `INSERT INTO users (username,email,role,password_hash)
         VALUES ('admin','admin@mob13r.com','admin',$1)`,
        [hash]
      );

      console.log("✅ Admin created:");
      console.log("username: admin");
      console.log("password:", password);
    } else {
      console.log("✅ Admin already exists, skipping...");
    }

  } catch (err) {
    console.error(err);
  }
}

seed();
