import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import advertisersRoutes from "./routes/advertisers.routes.js";
import offersRoutes from "./routes/offers.routes.js";
import offerExecutionRoutes from "./routes/offer-execution.routes.js";
import executionLogsRoutes from "./routes/execution-logs.routes.js";

const app = express();

/* ================= CORS (FIXED & SAFE) ================= */
app.use(
  cors({
    origin: [
      "https://dashboard.mob13r.com",
      "http://localhost:5173",
    ],
    credentials: true, // ✅ REQUIRED for Authorization header
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* ✅ EXPRESS 5 SAFE PREFLIGHT HANDLING */
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

/* ================= BODY ================= */
app.use(express.json());

/* ================= HEALTH ================= */
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

/* ================= ROUTES ================= */
app.use("/api/auth", authRoutes);
app.use("/api/advertisers", advertisersRoutes);
app.use("/api/offers", offersRoutes);
app.use("/api/offers", offerExecutionRoutes);
app.use("/api/execution-logs", executionLogsRoutes);

export default app;
