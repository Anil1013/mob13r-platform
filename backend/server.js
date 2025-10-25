// server.js — Mob13r Backend (Advertisers + Publishers)
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import pkg from "pg";
import dotenv from "dotenv";
import helmet from "helmet";

dotenv.config();
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 8080;

// ✅ Secure and enable cross-origin access for frontend
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://dashboard.mob13r.com",
      "https://main.d2ujj546i3rguh.amplifyapp.com"
    ],
    credentials: true,
  })
);

app.use(helmet());
app.use(bodyParser.json());
app.use(express.json());

// ✅ PostgreSQL RDS Connection
const pool = new Pool({
  host: process.env.DB_HOST || "mob13r-db.cpswoqw4opaa.ap-south-1.rds.amazonaws.com",
  user: process.env.DB_USER || "mob13r_admin",
  password: process.env.DB_PASSWORD || "your-db-password",
  database: process.env.DB_NAME || "mob13rdb",
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL database"))
  .catch((err) => console.error("❌ Database connection error:", err));

// ✅ Health check route
app.get("/api", (req, res) => {
  res.json({ message: "Mob13r Backend API is running ✅" });
});


// ==========================
// 📊 Publishers Endpoints
// ==========================
app.get("/api/publishers", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM publishers ORDER BY id ASC");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching publishers:", error);
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
  } catch (error) {
    console.error("Error adding publisher:", error);
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
  } catch (error) {
    console.error("Error updating publisher:", error);
    res.status(500).json({ error: "Failed to update publisher" });
  }
});

app.delete("/api/publishers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM publishers WHERE id=$1", [id]);
    res.json({ message: "Publisher deleted successfully" });
  } catch (error) {
    console.error("Error deleting publisher:", error);
    res.status(500).json({ error: "Failed to delete publisher" });
  }
});


// ==========================
// 📢 Advertisers Endpoints
// ==========================
app.get("/api/advertisers", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM advertisers ORDER BY id ASC");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching advertisers:", error);
    res.status(500).json({ error: "Failed to fetch advertisers" });
  }
});

app.post("/api/advertisers", async (req, res) => {
  try {
    const { name, contact, budget } = req.body;
    const result = await pool.query(
      "INSERT INTO advertisers (name, contact, budget) VALUES ($1, $2, $3) RETURNING *",
      [name, contact, budget]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error adding advertiser:", error);
    res.status(500).json({ error: "Failed to add advertiser" });
  }
});

app.put("/api/advertisers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact, budget } = req.body;
    const result = await pool.query(
      "UPDATE advertisers SET name=$1, contact=$2, budget=$3 WHERE id=$4 RETURNING *",
      [name, contact, budget, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating advertiser:", error);
    res.status(500).json({ error: "Failed to update advertiser" });
  }
});

app.delete("/api/advertisers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM advertisers WHERE id=$1", [id]);
    res.json({ message: "Advertiser deleted successfully" });
  } catch (error) {
    console.error("Error deleting advertiser:", error);
    res.status(500).json({ error: "Failed to delete advertiser" });
  }
});


// ==========================
// 🚀 Start the server
// ==========================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ API ready at https://backend.mob13r.com/api`);
});
