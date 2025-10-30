import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import bodyParser from "body-parser";
import pool from "./db.js";

// ✅ Routes
import adminRoutes from "./routes/admin.js";
import publishersRoutes from "./routes/publishers.js";
import advertisersRoutes from "./routes/advertisers.js";
import offersRoutes from "./routes/offers.js";
import clickRoutes from "./routes/clicks.js";
import postbackRoutes from "./routes/postbacks.js";
import conversionsRoutes from "./routes/conversions.js";
import statsRoutes from "./routes/stats.js";

import authKey from "./middleware/authKey.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

// ✅ CORS
app.use(cors({
  origin: ["https://dashboard.mob13r.com", "http://localhost:3000"],
  methods: "GET,POST,PUT,DELETE,OPTIONS",
  allowedHeaders: "Content-Type,Authorization,X-API-Key"
}));

app.options("*", cors());
app.use(helmet());
app.use(bodyParser.json());

// ✅ Public: health + create first admin key
app.use("/api/admin", adminRoutes); // first admin key allowed here

// ✅ Protected routes (after admin login)
app.use("/api/stats", authKey, statsRoutes);
app.use("/api/publishers", authKey, publishersRoutes);
app.use("/api/advertisers", authKey, advertisersRoutes);
app.use("/api/offers", authKey, offersRoutes);
app.use("/api/clicks", authKey, clickRoutes);
app.use("/api/postbacks", authKey, postbackRoutes);
app.use("/api/conversions", authKey, conversionsRoutes);

// ✅ Start
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend running: ${PORT}`);
});
