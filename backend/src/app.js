import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import advertisersRoutes from "./routes/advertisers.routes.js";

const app = express();

/* ================= CORS CONFIG ================= */
app.use(
  cors({
    origin: [
      "https://dashboard.mob13r.com",
      "http://localhost:5173"
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// IMPORTANT: preflight
app.options("*", cors());

app.use(express.json());

/* ================= ROUTES ================= */
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

app.use("/api/auth", authRoutes);
app.use("/api/advertisers", advertisersRoutes);

export default app;
