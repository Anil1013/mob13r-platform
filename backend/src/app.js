import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";

const app = express(); // ✅ FIXED: express()

/* 🔥 CORS */
app.use(cors({
  origin: ["https://dashboard.mob13r.com"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.options("*", cors());

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

app.use("/api/auth", authRoutes);

export default app;
