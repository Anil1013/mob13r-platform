import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";

const app = express;

/* 🔥 HARD CORS FIX */
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://dashboard.mob13r.com");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

app.use("/api/auth", authRoutes);

export default app;
