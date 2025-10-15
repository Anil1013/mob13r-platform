import express from "express";

const router = express.Router();

// ✅ Health check for admin routes
router.get("/", (req, res) => {
  res.send("Admin API is running 🚀");
});

// ✅ Partners endpoint
router.get("/partners", async (req, res) => {
  try {
    const partners = [
      { id: 1, name: "SEL Telecom", country: "Oman" },
      { id: 2, name: "Ooredoo", country: "Qatar" },
      { id: 3, name: "Omantel", country: "Oman" },
      { id: 4, name: "Mobily", country: "Saudi Arabia" },
    ];
    res.json(partners);
  } catch (error) {
    console.error("Error fetching partners:", error);
    res.status(500).json({ error: "Failed to fetch partners" });
  }
});

// ✅ Reports endpoint
router.get("/reports", async (req, res) => {
  try {
    const reports = [
      { date: "2025-10-14", partner: "SEL Telecom", clicks: 4393, conversions: 192, revenue: 96.0, payout: 67.2, profit: 28.8 },
      { date: "2025-10-13", partner: "Ooredoo", clicks: 3812, conversions: 112, revenue: 56.0, payout: 39.2, profit: 16.8 },
      { date: "2025-10-12", partner: "Omantel", clicks: 3360, conversions: 94, revenue: 47.0, payout: 32.9, profit: 14.1 },
      { date: "2025-10-11", partner: "Mobily", clicks: 3050, conversions: 121, revenue: 60.5, payout: 42.35, profit: 18.15 },
    ];
    res.json(reports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

export default router;
