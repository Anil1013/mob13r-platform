import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import advertisersRoutes from "./routes/advertisers.routes.js";
import offersRoutes from "./routes/offers.routes.js";

const app = express();

/* ================= CORS (EXPRESS 5 SAFE) ================= */
app.use(
  cors({
    origin: [
      "https://dashboard.mob13r.com",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* ⚠️ DO NOT USE app.options("*") in Express 5 */

app.use(express.json());

/* ================= HEALTH ================= */
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

/* ================= ROUTES ================= */
app.use("/api/auth", authRoutes);
app.use("/api/advertisers", advertisersRoutes);
app.use("/api/offers", offersRoutes);

export default app;
