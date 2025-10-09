import { initModels, sequelize } from "./models.js";

export default async function seed() {
  const { Partner, Offer, Affiliate } = initModels(); // ✅ Initialize models here

  console.log("🌱 Seeding default data...");

  await Partner.findOrCreate({
    where: { name: "Default Partner" },
    defaults: { api_base: "https://example.com/api", status: "active" },
  });

  await Offer.findOrCreate({
    where: { offer_id: "001" },
    defaults: {
      name: "Test Offer",
      geo: "OM",
      carrier: "Omantel",
      partner_cpa: 1.5,
      ref_url: "https://redirect.link",
      request_url: "https://offer.api/send",
      verify_url: "https://offer.api/verify",
      status: "active",
    },
  });

  await Affiliate.findOrCreate({
    where: { email: "test@affiliate.com" },
    defaults: {
      name: "Demo Affiliate",
      password: "password123",
      role: "admin",
    },
  });

  console.log("✅ Seed data added successfully");
}
