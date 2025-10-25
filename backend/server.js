// ✅ Mob13r Backend — Windows & ESM Safe
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Import local modules normally (relative paths work now)
import pool from "./db/db.js";
import { initDatabase } from "./db/initTables.js";
import clickRoutes from "./routes/clicks.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

// =========================
// 🔒 Middleware
// =========================
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://dashboard.mob13r.com",
      "https://main.d2ujj546i3rguh.amplifyapp.com",
    ],
    credentials: true,
  })
);
app.use(helmet());
app.use(bodyParser.json());
app.use(express.json());

// ✅ Routes
app.use("/api/clicks", clickRoutes);

// ✅ Initialize Database Tables Automatically
initDatabase();

// ✅ Health Check
app.get("/api", (req, res) => {
  res.json({ message: "Mob13r Backend API is running ✅" });
});

// =========================
// 📊 Publishers API
// =========================
app.get("/api/publishers", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM publishers ORDER BY id ASC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch publishers" });
  }
});

app.post("/api/publishers", async (req, res) => {
  try {
    const { name, email, status } = req.body;
    const result = await pool.query(
      "INSERT INTO publishers (name, email, status) VALUES ($1, $2, $3) RETURNING *",
      [name, email, status || "active"]
    );
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to add publisher" });
  }
});

app.put("/api/publishers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, status } = req.body;
    const result = await pool.query(
      "UPDATE publishers SET name=$1, email=$2, status=$3 WHERE id=$4 RETURNING *",
      [name, email, status, id]
    );
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to update publisher" });
  }
});

app.delete("/api/publishers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM publishers WHERE id=$1", [id]);
    res.json({ message: "Publisher deleted successfully" });
  } catch {
    res.status(500).json({ error: "Failed to delete publisher" });
  }
});

// =========================
// 📢 Advertisers API
// =========================
app.get("/api/advertisers", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM advertisers ORDER BY id ASC");
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch advertisers" });
  }
});

app.post("/api/advertisers", async (req, res) => {
  try {
    const { name, api_base, status } = req.body;
    const result = await pool.query(
      "INSERT INTO advertisers (name, api_base, status) VALUES ($1, $2, $3) RETURNING *",
      [name, api_base, status || "active"]
    );
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to add advertiser" });
  }
});

app.put("/api/advertisers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, api_base, status } = req.body;
    const result = await pool.query(
      "UPDATE advertisers SET name=$1, api_base=$2, status=$3 WHERE id=$4 RETURNING *",
      [name, api_base, status, id]
    );
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to update advertiser" });
  }
});

app.delete("/api/advertisers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM advertisers WHERE id=$1", [id]);
    res.json({ message: "Advertiser deleted successfully" });
  } catch {
    res.status(500).json({ error: "Failed to delete advertiser" });
  }
});

// =========================
// 💰 Offers API
// =========================
app.get("/api/offers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, a.name AS advertiser_name
      FROM offers o
      LEFT JOIN advertisers a ON o.advertiser_id = a.id
      ORDER BY o.id DESC
    `);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch offers" });
  }
});

app.post("/api/offers", async (req, res) => {
  try {
    const { advertiser_id, title, payout, url } = req.body;
    const result = await pool.query(
      "INSERT INTO offers (advertiser_id, title, payout, url) VALUES ($1, $2, $3, $4) RETURNING *",
      [advertiser_id, title, payout, url]
    );
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to add offer" });
  }
});

app.put("/api/offers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { advertiser_id, title, payout, url } = req.body;
    const result = await pool.query(
      "UPDATE offers SET advertiser_id=$1, title=$2, payout=$3, url=$4 WHERE id=$5 RETURNING *",
      [advertiser_id, title, payout, url, id]
    );
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to update offer" });
  }
});

app.delete("/api/offers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM offers WHERE id=$1", [id]);
    res.json({ message: "Offer deleted successfully" });
  } catch {
    res.status(500).json({ error: "Failed to delete offer" });
  }
});

app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() as time");
    res.json({ status: "✅ Connected", time: result.rows[0].time });
  } catch (err) {
    console.error("❌ DB connection test failed:", err);
    res.status(500).json({ status: "❌ Failed", error: err.message });
  }
});

// =========================
// 🚀 Start Server
// =========================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ API ready at https://backend.mob13r.com/api`);
});
