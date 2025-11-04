import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import bodyParser from "body-parser";
import pool from "./db.js";

import publishersRoutes from "./routes/publishers.js";
import advertisersRoutes from "./routes/advertisers.js";
import offersRoutes from "./routes/offers.js";
import clickRoutes from "./routes/clicks.js";
import postbackRoutes from "./routes/postbacks.js";
import conversionsRoutes from "./routes/conversions.js";
import statsRoutes from "./routes/stats.js";

import authRoutes from "./routes/auth.js";
import authJWT from "./middleware/authJWT.js";   // ✅ fixed import

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

app.use(
  cors({
    origin: ["https://dashboard.mob13r.com", "http://localhost:3000"],
    credentials: true,
    methods: "GET, POST, PUT, DELETE, OPTIONS",
    allowedHeaders: ["Content-Type", Authorization"]
  })
);

app.options("*", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "https://dashboard.mob13r.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers
