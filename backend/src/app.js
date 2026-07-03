import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";

import authRoutes from "./routes/auth.routes.js";
import advertisersRoutes from "./routes/advertisers.routes.js";
import offersRoutes from "./routes/offers.routes.js";
import pinRoutes from "./routes/pin.routes.js";
import dumpRoutes from "./routes/dashboard.dump.routes.js";
import landingRoutes from "./routes/landing.routes.js";
import docsRoutes from "./routes/publisher.docs.routes.js";
import publisherRoutes from "./routes/publisher.routes.js";
import publisherDashboardRoutes from "./routes/publisher.dashboard.routes.js";
import publishersRoutes from "./routes/publishers.routes.js";
import autoConfigRoutes from "./routes/auto-config.routes.js";
import dashboardReportRoutes from "./routes/dashboard.report.routes.js";
import saasAuthRoutes from "./routes/saas/auth.routes.js";
import saasOrgRoutes from "./routes/saas/org.routes.js";
import saasAdminRoutes from "./routes/saas/admin.routes.js";
import carrierPrefixRoutes from "./routes/carrier-prefixes.routes.js";

const app = express();

app.set("trust proxy", 1);

app.use(cors({
  origin: [
    "https://dashboard.mob13r.com",
    "https://backend.mob13r.com",
    "http://localhost:5173",
    "http://localhost:3000",
  ],
  credentials: true,
}));

app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: "/tmp/",
  createParentPath: true,
  abortOnLimit: true,
  safeFileNames: true,
  preserveExtension: true,
  parseNested: true,
  debug: process.env.NODE_ENV !== "production",
  limits: { fileSize: 50 * 1024 * 1024 },
}));

app.use("/uploads", express.static("public/uploads"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

app.get("/health", (req, res) => res.json({ status: "OK" }));

app.use("/api/auth", authRoutes);
app.use("/api/advertisers", advertisersRoutes);
app.use("/api/offers", offersRoutes);
app.use("/api", pinRoutes);
app.use("/api", dumpRoutes);
app.use("/api", autoConfigRoutes);
app.use("/api/landing", landingRoutes);
app.use("/api", dashboardReportRoutes);
app.use("/api/publisher", publisherRoutes);
app.use("/api/publisher", publisherDashboardRoutes);
app.use("/api/publishers", publishersRoutes);
app.use("/api", docsRoutes);
app.use("/api/saas", saasAuthRoutes);
app.use("/api/saas", saasOrgRoutes);
app.use("/api/saas", saasAdminRoutes);
app.use("/api", carrierPrefixRoutes);

app.use((req, res) => {
  res.status(404).json({ status: "FAILED", error: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);
  if (err?.message === "Unexpected end of form")
    return res.status(400).json({ status: "FAILED", error: "Multipart upload interrupted. Please retry." });
  if (err?.code === "LIMIT_FILE_SIZE")
    return res.status(400).json({ status: "FAILED", error: "File size too large" });
  if (err?.message?.includes("File too large"))
    return res.status(400).json({ status: "FAILED", error: "Uploaded file exceeds allowed limit" });
  res.status(500).json({ status: "FAILED", error: err?.message || "Internal Server Error" });
});

export default app;
