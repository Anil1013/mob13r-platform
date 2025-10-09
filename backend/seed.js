// backend/seed.js
import { initModels, sequelize } from "./models.js";

export default async function seed() {
  console.log("🌱 Seeding default data...");

  const { Partner, Offer, Affiliate, AffiliateOffer } = initModels();

  try {
    // 1️⃣ Partners
    const [partner1] = await Partner.findOrCreate({
      where: { name: "SEL Telecom" },
      defaults: {
        api_base: "https://sel.api.com",
        status: "active",
      },
    });

    const [partner2] = await Partner.findOrCreate({
      where: { name: "Evina Mobile" },
      defaults: {
        api_base: "https://evina.api.com",
        status: "active",
      },
    });

    // 2️⃣ Offers
    const [offer1] = await Offer.findOrCreate({
      where: { offer_id: "GAMES_OMAN" },
      defaults: {
        name: "Games Weekly Offer",
        geo: "OM",
        carrier: "Omantel",
        partner_cpa: 1.5,
        ref_url: "https://games.om",
        request_url: "https://sel.api.com/pin/send",
        verify_url: "https://sel.api.com/pin/validate",
        status: "active",
        PartnerId: partner1.id,
      },
    });

    const [offer2] = await Offer.findOrCreate({
      where: { offer_id: "MUSIC_QATAR" },
      defaults: {
        name: "Music Daily Offer",
        geo: "QA",
        carrier: "Ooredoo",
        partner_cpa: 1.2,
        ref_url: "https://music.qa",
        request_url: "https://evina.api.com/otp/send",
        verify_url: "https://evina.api.com/otp/validate",
        status: "active",
        PartnerId: partner2.id,
      },
    });

    // 3️⃣ Affiliates
    const [affiliate1] = await Affiliate.findOrCreate({
      where: { email: "anil@mob13r.com" },
      defaults: {
        name: "Anil Kumar",
        password: "anil1234",
        role: "admin",
      },
    });

    const [affiliate2] = await Affiliate.findOrCreate({
      where: { email: "publisher@mob13r.com" },
      defaults: {
        name: "Publisher Partner",
        password: "pub1234",
        role: "affiliate",
      },
    });

    // 4️⃣ Affiliate Offers
    await AffiliateOffer.findOrCreate({
      where: { AffiliateId: affiliate2.id, OfferId: offer1.id },
      defaults: {
        affiliate_cpa: 0.8,
        pass_percent: 60,
        status: "active",
      },
    });

    console.log("✅ Seed data added successfully");
  } catch (err) {
    console.error("❌ Error during seed:", err);
  }
}
