import fs from "fs";
import path from "path";
import pool from "./db.js";
import { fileURLToPath } from "url";

// ✅ Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  console.log("🚀 Running DB migrations...");

  try {
    const client = await pool.connect();
    const migrationsPath = path.join(__dirname, "../migrations");

    const files = fs.readdirSync(migrationsPath)
      .filter(f => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsPath, file), "utf8");
      console.log(`→ Running ${file}`);
      await client.query(sql);
    }

    client.release();
    console.log("✅ Migrations completed.");
  } catch (err) {
    console.error("❌ Migration error:", err);
    process.exit(1);
  }
}

// ✅ Auto-run when called directly (ES module safe)
if (process.argv[1].includes("migrate.js")) {
  migrate();
}

export default migrate;
