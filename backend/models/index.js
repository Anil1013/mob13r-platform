// backend/models/index.js
import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import { initPublisher } from "./Publisher.js";
import { initAdvertiser } from "./Advertiser.js";
import { setupAssociations } from "./associations.js";

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: "postgres",
    port: process.env.DB_PORT || 5432,
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  }
);

// Initialize models
const Publisher = initPublisher(sequelize);
const Advertiser = initAdvertiser(sequelize);

// Setup associations (Publisher ↔ Advertiser)
setupAssociations({ Publisher, Advertiser });

// Connect and sync DB
try {
  await sequelize.authenticate();
  console.log("✅ Connected to PostgreSQL successfully!");
  await sequelize.sync({ alter: true }); // Auto-create or update tables
  console.log("🧩 Tables synced with Sequelize models.");
} catch (error) {
  console.error("❌ DB Connection Error:", error.message);
}

export { sequelize, Publisher, Advertiser };
