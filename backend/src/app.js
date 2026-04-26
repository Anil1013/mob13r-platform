import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";
import multer from "multer";

/* -------- ROUTES -------- */
import authRoutes from "./routes/auth.routes.js";
import advertisersRoutes from "./routes/advertisers.routes.js";
import offersRoutes from "./routes/offers.routes.js";
import pinRoutes from "./routes/pin.routes.js";
import dumpRoutes from "./routes/dashboard.dump.routes.js";
import landingRoutes from "./routes/landing.routes.js";
import docsRoutes from "./routes/publisher.docs.routes.js";

/* 👉 PUBLISHER ROUTES */
import publisherRoutes from "./routes/publisher.routes.js";
import publisherDashboardRoutes from "./routes/publisher.dashboard.routes.js";
import publishersRoutes from "./routes/publishers.routes.js";
import autoConfigRoutes from "./routes/auto-config.routes.js";

/* 👉 DASHBOARD ROUTES */
import dashboardReportRoutes from "./routes/dashboard.report.routes.js";

const app = express();

/* -------- MIDDLEWARE -------- */

app.use(cors());

app.use(fileUpload({
  useTempFiles: true,         // ✅ True hona chahiye taaki crash na ho
  tempFileDir: '/tmp/',       // ✅ Linux server ke liye /tmp/ best hai
  limits: { fileSize: 50 * 1024 * 1024 }, 
  createParentPath: true      // ✅ Folder apne aap ban jayega
}));

const upload = multer({ dest: '/tmp/' });

app.use('/uploads', express.static('public/uploads'));

app.use(express.json());

app.use(express.urlencoded({ extended: true })); // ✅ ADD THIS

/* -------- HEALTH CHECK -------- */

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

/* -------- CORE APIs -------- */

app.use("/api/auth", authRoutes);

app.use("/api/advertisers", advertisersRoutes);

app.use("/api/offers", offersRoutes);

app.use("/api", pinRoutes);

app.use("/api", dumpRoutes);

app.use("/api", autoConfigRoutes);

app.use("/api/landing", landingRoutes);

/* -------- DASHBOARD APIs -------- */

/**
 * Dashboard reporting
 * → /api/dashboard/report
 * → /api/dashboard/realtime
 */

app.use("/api", dashboardReportRoutes);

/* -------- PUBLISHER APIs -------- */

/**
 * PIN SEND / VERIFY
 * → /api/publisher/pin/send
 * → /api/publisher/pin/verify
 */

app.use("/api/publisher", publisherRoutes);

/**
 * DASHBOARD
 * → /api/publisher/dashboard/summary
 * → /api/publisher/dashboard/offers
 */

app.use("/api/publisher", publisherDashboardRoutes);

app.use("/api/publishers", publishersRoutes);

app.use("/api", docsRoutes);

export default app;
