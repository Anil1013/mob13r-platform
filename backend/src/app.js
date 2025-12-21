import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";

const app = express();

/* 🔥 CORS FIX — VERY IMPORTANT */
app.use(cors({
  origin: [
    "https://dashboard.mob13r.com",
    "http://localhost:5173"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Preflight requests allow
app.options("*", cors());

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

/* API routes */
app.use("/api/auth", authRoutes);

export default app;
