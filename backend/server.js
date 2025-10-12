import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import { sequelize, initModels } from "./models.js";
import routes from "./routes/index.js";
import seed from "./seed.js";

dotenv.config();
const app = express();

// ✅ AWS health check route (important for "Green" health)
app.get("/", (req, res) => {
  res.send("✅ Mob13r Backend is Live and Connected to AWS RDS!");
});

// ✅ Allow frontend + local dev
const frontendOrigin = process.env.FRONTEND_URL || "http://localhost:3000";
app.use(cors({ origin: [frontendOrigin, "http://localhost:3000"] }));

app.use(bodyParser.json());
app.use("/api", routes);

const PORT = process.env.PORT || 8080; // ✅ use AWS default port 8080

// ✅ Initialize models and database
(async () => {
  try {
    initModels();

    await sequelize.authenticate();
    console.log("✅ Database connection established.");

    await sequelize.sync({ alter: true });
    console.log("✅ DB synced successfully");

    await seed();

    app.listen(PORT, () =>
      console.log(`🚀 Backend running on port ${PORT}`)
    );
  } catch (error) {
    console.error("❌ Startup Error:", error);
    process.exit(1);
  }
})();
