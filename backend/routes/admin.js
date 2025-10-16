import express from "express";

const router = express.Router();

// ===============================
// ✅ Reports API
// ===============================
router.get("/reports", async (req, res) => {
  try {
    const reports = [
      { date: "2025-10-14", partner: "Partner 1", affiliate: "Affiliate A", offer: "Offer Alpha", clicks: 4393, conversions: 192, revenue: 96.0, payout: 67.2, profit: 28.8 },
      { date: "2025-10-13", partner: "Partner 2", affiliate: "Affiliate B", offer: "Offer Beta", clicks: 3812, conversions: 112, revenue: 56.0, payout: 39.2, profit: 16.8 },
      { date: "2025-10-12", partner: "Partner 3", affiliate: "Affiliate C", offer: "Offer Gamma", clicks: 3360, conversions: 94, revenue: 47.0, payout: 32.9, profit: 14.1 },
      { date: "2025-10-11", partner: "Partner 4", affiliate: "Affiliate D", offer: "Offer Delta", clicks: 3050, conversions: 121, revenue: 60.5, payout: 42.35, profit: 18.15 },
    ];
    res.json(reports);
  } catch (err) {
    console.error("Error fetching reports:", err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// ===============================
// ✅ Partners API
// ===============================
router.get("/partners", async (req, res) => {
  const partners = ["Partner 1", "Partner 2", "Partner 3", "Partner 4"];
  res.json(partners);
});

// ===============================
// ✅ Affiliates API
// ===============================
router.get("/affiliates", async (req, res) => {
  const affiliates = ["Affiliate A", "Affiliate B", "Affiliate C", "Affiliate D"];
  res.json(affiliates);
});

// ===============================
// ✅ Offers API
// ===============================
router.get("/offers", async (req, res) => {
  const offers = ["Offer Alpha", "Offer Beta", "Offer Gamma", "Offer Delta"];
  res.json(offers);
});

// Default route
router.get("/", (req, res) => {
  res.send("✅ Admin API is live");
});

export default router;
