import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fileUpload from "express-fileupload"; // 🔥 MISSING IMPORT ADDED
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
app.options("*", cors(corsOptions));

/* ✅ BODY SIZE FIX (413 ERROR FIX - Phase 1) */
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

/* ✅ FILE UPLOAD MIDDLEWARE (YE ZARURI HAI FILE PARSING KE LIYE) */
app.use(fileUpload({
  limits: { fileSize: 100 * 1024 * 1024 }, // 🔥 100MB limit for files
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

/* ✅ HEALTH CHECK */
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

/* ROUTES */
app.use(appRoutes);

/* ✅ GLOBAL ERROR HANDLER */
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
