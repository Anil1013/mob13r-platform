import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import appRoutes from "./app.js";

dotenv.config();

const app = express();

/* ✅ CORS – FINAL FIX */
app.use(
  cors({
    origin: [
      "https://dashboard.mob13r.com",
      "http://localhost:5173",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-publisher-key"   // 🔥 THIS WAS MISSING
    ],
  })
);

/* ✅ REQUIRED FOR PREFLIGHT (VERY IMPORTANT) */
app.options("*", cors());

app.use(express.json());

/* ROUTES */
app.use(appRoutes);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
