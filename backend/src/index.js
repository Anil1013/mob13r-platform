import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();

app.use(cors({
  origin: ["https://dashboard.mob13r.com"],
  credentials: true,
  methods: "GET,POST,PUT,DELETE,OPTIONS",
  allowedHeaders: "Content-Type, Authorization"
}));

app.use(express.json());

// ✅ Preflight OPTIONS handler
app.options("*", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "https://dashboard.mob13r.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(200);
});

// ✅ your routes start below
import authRoutes from "./routes/auth.js";
// ...
