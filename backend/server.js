import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import { sequelize, initModels } from "./models.js";
import adminRoutes from "./routes/admin.js"; // ✅ import
import seed from "./seed.js";

dotenv.config();
const app = express();

app.get("/", (req, res) => {
  res.send("✅ Mob13r Backend is Live and Connected to AWS RDS!");
});

app.use(cors({
  origin: [
    "https://dashboard.mob13r.com",
    "http://localhost:3000",
  ],
  credentials: true,
}));

app.use(bodyParser.json());

// ✅ Use the routes
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT || 8080;

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
