import { initModels, sequelize } from "./models.js";
import bcrypt from "bcrypt";

const { Partner, Offer, Affiliate, AffiliateOffer } = sequelize.models;

export default async function seed() {
  // ensure models exist
  await initModels();

  // Partners
  await Partner.findOrCreate({
    where: { name: "Velti" },
    defaults: { api_base: "https://grandprizehero.com/api" },
  });
  await Partner.findOrCreate({
    where: { name: "Kimia" },
    defaults: { api_base: "https://api.kimia.com" },
  });

  // Offer
  const [offer] = await Offer.findOrCreate({
    where: { offer_id: "OFFR-123ABC" },
    defaults: {
      name: "Grand Prize Hero",
      geo: "IQ",
      carrier: "Asiacell",
      partner_cpa: 0.8,
      ref_url: "collectcent_api",
      request_url: "https://grandprizehero.com/api/requestPinInApp",
      verify_url: "https://grandprizehero.com/api/verifyPinInApp",
    },
  });

  // Default affiliate (demo)
  const [aff] = await Affiliate.findOrCreate({
    where: { email: "traffic@demo.com" },
    defaults: { name: "Traffic Company", password: await bcrypt.hash("pass", 10) },
  });

  // AffiliateOffer mapping
  await AffiliateOffer.findOrCreate({
    where: { AffiliateId: aff.id, OfferId: offer.id },
    defaults: { affiliate_cpa: 0.6, pass_percent: 85 },
  });

  // Default admin user — from your input
  const adminEmail = "ruhil.13r@gmail.com";
  const adminPasswordPlain = "Anil@1234";
  const adminHash = await bcrypt.hash(adminPasswordPlain, 10);

  await Affiliate.findOrCreate({
    where: { email: adminEmail },
    defaults: {
      name: "Mob13r Admin",
      password: adminHash,
      role: "admin",
    },
  });

  console.log("✅ Seeding complete (default admin created).");
}
