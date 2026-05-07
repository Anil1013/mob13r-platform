import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";

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

/* =========================================
   TRUST PROXY
========================================= */

app.set("trust proxy", 1);

/* =========================================
   CORS
========================================= */

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

/* =========================================
   FILE UPLOAD
   IMPORTANT:
   MUST COME BEFORE express.json()
========================================= */

app.use(
  fileUpload({
    useTempFiles: true,

    tempFileDir: "/tmp/",

    createParentPath: true,

    abortOnLimit: true,

    safeFileNames: true,

    preserveExtension: true,

    parseNested: true,

    debug: false,

    limits: {
      fileSize:
        50 * 1024 * 1024,
    },
  })
);

/* =========================================
   STATIC FILES
========================================= */

app.use(
  "/uploads",
  express.static(
    "public/uploads"
  )
);

/* =========================================
   BODY PARSER
========================================= */

app.use(
  express.json({
    limit: "50mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "50mb",
  })
);

/* =========================================
   HEALTH CHECK
========================================= */

app.get(
  "/health",
  (req, res) => {
    res.json({
      status: "OK",
    });
  }
);

/* =========================================
   CORE APIs
========================================= */

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/advertisers",
  advertisersRoutes
);

app.use(
  "/api/offers",
  offersRoutes
);

app.use(
  "/api",
  pinRoutes
);

app.use(
  "/api",
  dumpRoutes
);

app.use(
  "/api",
  autoConfigRoutes
);

app.use(
  "/api/landing",
  landingRoutes
);

/* =========================================
   DASHBOARD APIs
========================================= */

/**
 * Dashboard reporting
 * → /api/dashboard/report
 * → /api/dashboard/realtime
 */

app.use(
  "/api",
  dashboardReportRoutes
);

/* =========================================
   PUBLISHER APIs
========================================= */

/**
 * PIN SEND / VERIFY
 * → /api/publisher/pin/send
 * → /api/publisher/pin/verify
 */

app.use(
  "/api/publisher",
  publisherRoutes
);

/**
 * DASHBOARD
 * → /api/publisher/dashboard/summary
 * → /api/publisher/dashboard/offers
 */

app.use(
  "/api/publisher",
  publisherDashboardRoutes
);

app.use(
  "/api/publishers",
  publishersRoutes
);

app.use(
  "/api",
  docsRoutes
);

/* =========================================
   GLOBAL ERROR HANDLER
========================================= */

app.use(
  (
    err,
    req,
    res,
    next
  ) => {
    console.error(
      "GLOBAL ERROR:",
      err
    );

    res.status(500).json({
      status: "FAILED",
      error:
        err.message ||
        "Internal Server Error",
    });
  }
);

export default app;
