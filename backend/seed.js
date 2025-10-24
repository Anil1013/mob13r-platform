// backend/seed.js
import { sequelize, Publisher, Advertiser } from "./models/index.js";

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    await sequelize.sync({ alter: true });

    // Seed one publisher
    const publisher = await Publisher.create({
      name: "Default Publisher",
      email: "publisher@mob13r.com",
    });

    // Seed one advertiser
    const advertiser = await Advertiser.create({
      name: "Default Advertiser",
      email: "advertiser@mob13r.com",
      api_base: "https://api.example.com",
    });

    console.log("✅ Seed data inserted successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seed();

