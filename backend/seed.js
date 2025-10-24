// backend/seed.js
import { sequelize } from "./models/index.js";
import { Publisher, Advertiser } from "./models/associations.js";

console.log("🌱 Starting database seed...");

const seed = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log("✅ Database tables synced!");

    // Seed demo data
    await Advertiser.findOrCreate({
      where: { name: "Demo Advertiser" },
      defaults: {
        contact_email: "advertiser@demo.com",
        offer_url: "https://demo-offer.com",
      },
    });

    await Publisher.findOrCreate({
      where: { name: "Demo Publisher" },
      defaults: {
        email: "publisher@demo.com",
        website: "https://demo-publisher.com",
      },
    });

    console.log("✅ Seed data inserted successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
};

seed();
