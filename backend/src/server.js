import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import appRoutes from "./app.js";

dotenv.config();

const app = express();

/* ✅ TRUST PROXY (IMPORTANT for AWS / Nginx) */
app.set("trust proxy", 1);

/* ✅ CORS – FINAL FIX */
const corsOptions = {
  origin: [
    "https://dashboard.mob13r.com",
    "http://localhost:5173",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-api-key",
    "x-publisher-key",
  ],
};

app.use(cors(corsOptions));

/* ✅ PREFLIGHT HANDLING (VERY IMPORTANT) */
app.options("*", cors(corsOptions));

/* ✅ BODY SIZE FIX (413 ERROR FIX) */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

/* ✅ HEALTH CHECK (OPTIONAL BUT USEFUL) */
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

/* ROUTES */
app.use(appRoutes);

/* ✅ GLOBAL ERROR HANDLER (IMPORTANT) */
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);

  res.status(err.status || 500).json({
    status: "FAILED",
    message: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
