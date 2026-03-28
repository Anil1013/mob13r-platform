import express from "express";
import cors from "cors";

/* -------- ROUTES -------- */
import authRoutes from "./routes/auth.routes.js";
import advertisersRoutes from "./routes/advertisers.routes.js";
import offersRoutes from "./routes/offers.routes.js";
import pinRoutes from "./routes/pin.routes.js";
import dumpRoutes from "./routes/dashboard.dump.routes.js";
import landingRoutes from "./routes/landing.routes.js";

/* 👉 PUBLISHER ROUTES */
import publisherRoutes from "./routes/publisher.routes.js";
import publisherDashboardRoutes from "./routes/publisher.dashboard.routes.js";
import publishersRoutes from "./routes/publishers.routes.js";

/* 👉 DASHBOARD ROUTES */
import dashboardReportRoutes from "./routes/dashboard.report.routes.js";

const app = express();

/* -------- MIDDLEWARE -------- */

app.use(cors());
app.use(express.json());

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

export default app;
