import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import { sequelize, initModels } from "./models.js";
import adminRoutes from "./routes/admin.js";
import seed from "./seed.js";

dotenv.config();
const app = express();

// ✅ AWS health check route
app.get("/", (req, res) => {
  res.send("✅ Mob13r Backend is Live and Connected to AWS RDS!");
});

// ✅ Allow specific frontend domains
const allowedOrigins = [
  "https://dashboard.mob13r.com", // Amplify frontend (LIVE)
  "http://localhost:3000",        // Local dev
];

// ✅ Use dynamic CORS check
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow Postman, internal calls
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = `CORS blocked: The CORS policy does not allow access from origin ${origin}`;
        console.warn(msg);
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(bodyParser.json());

// ✅ Mount all admin routes under /api/admin
app.use("/api/admin", adminRoutes);

// ✅ Catch-all route for 404
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

const PORT = process.env.PORT || 8080;

// ✅ Initialize models and database
(async () => {
  try {
    initModels();
    await sequelize.authenticate();
    console.log("✅ Database connection established.");

    await sequelize.sync({ alter: true });
    console.log("✅ DB synced successfully");

    await seed();

    app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
  } catch (error) {
    console.error("❌ Startup Error:", error);
    process.exit(1);
  }
})();
