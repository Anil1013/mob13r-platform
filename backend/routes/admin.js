import express from "express";

const router = express.Router();

// ===============================
// ✅ GET /api/admin/reports
// ===============================
router.get("/reports", async (req, res) => {
  try {
    // Static demo report data
    const reports = [
      { date: "2025-10-14", partner: "Partner 1", clicks: 4393, conversions: 192, revenue: 96.0, payout: 67.2, profit: 28.8 },
      { date: "2025-10-13", partner: "Partner 2", clicks: 3812, conversions: 112, revenue: 56.0, payout: 39.2, profit: 16.8 },
      { date: "2025-10-12", partner: "Partner 3", clicks: 3360, conversions: 94, revenue: 47.0, payout: 32.9, profit: 14.1 },
      { date: "2025-10-11", partner: "Partner 4", clicks: 3050, conversions: 121, revenue: 60.5, payout: 42.35, profit: 18.15 },
      { date: "2025-10-10", partner: "Partner 1", clicks: 4576, conversions: 188, revenue: 282.0, payout: 197.4, profit: 84.6 },
      { date: "2025-10-09", partner: "Partner 2", clicks: 2902, conversions: 87, revenue: 43.5, payout: 30.45, profit: 13.05 },
      { date: "2025-10-08", partner: "Partner 3", clicks: 4505, conversions: 83, revenue: 41.5, payout: 29.05, profit: 12.45 },
    ];
    res.json(reports);
  } catch (err) {
    console.error("Error fetching reports:", err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// ===============================
// ✅ GET /api/admin/partners
// ===============================
router.get("/partners", async (req, res) => {
  try {
    const partners = [
      { id: 1, name: "Partner 1", status: "Active" },
      { id: 2, name: "Partner 2", status: "Active" },
      { id: 3, name: "Partner 3", status: "Inactive" },
      { id: 4, name: "Partner 4", status: "Active" },
    ];
    res.json(partners);
  } catch (err) {
    console.error("Error fetching partners:", err);
    res.status(500).json({ error: "Failed to fetch partners" });
  }
});

// ===============================
// ✅ GET /api/admin/affiliates
// ===============================
router.get("/affiliates", async (req, res) => {
  try {
    const affiliates = [
      { id: 1, name: "Affiliate A", country: "India", status: "Active" },
      { id: 2, name: "Affiliate B", country: "UAE", status: "Active" },
      { id: 3, name: "Affiliate C", country: "Oman", status: "Inactive" },
    ];
    res.json(affiliates);
  } catch (err) {
    console.error("Error fetching affiliates:", err);
    res.status(500).json({ error: "Failed to fetch affiliates" });
  }
});

// ===============================
// ✅ GET /api/admin/offers
// ===============================
router.get("/offers", async (req, res) => {
  try {
    const offers = [
      { id: 1, name: "Gaming Pack", operator: "Omantel", price: "1.2 OMR", validity: "Weekly" },
      { id: 2, name: "Music Zone", operator: "Ooredoo", price: "1.0 OMR", validity: "Weekly" },
      { id: 3, name: "Movies+", operator: "Omantel", price: "1.5 OMR", validity: "Monthly" },
    ];
    res.json(offers);
  } catch (err) {
    console.error("Error fetching offers:", err);
    res.status(500).json({ error: "Failed to fetch offers" });
  }
});

// ===============================
// ✅ Root check
// ===============================
router.get("/", (req, res) => {
  res.send("✅ Admin API is live and responding 🚀");
});

export default router;
