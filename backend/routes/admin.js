import express from "express";
const router = express.Router();

// ✅ Reports Route
router.get("/reports", async (req, res) => {
  try {
    const reports = [
      { date: "2025-10-14", partner: "SEL Telecom", clicks: 4393, conversions: 192, revenue: 96.0, payout: 67.2, profit: 28.8 },
      { date: "2025-10-13", partner: "Mob13r", clicks: 3812, conversions: 112, revenue: 56.0, payout: 39.2, profit: 16.8 },
      { date: "2025-10-12", partner: "Tapflow", clicks: 3360, conversions: 94, revenue: 47.0, payout: 32.9, profit: 14.1 },
      { date: "2025-10-11", partner: "Mob13r", clicks: 3050, conversions: 121, revenue: 60.5, payout: 42.35, profit: 18.15 },
      { date: "2025-10-10", partner: "SEL Telecom", clicks: 4576, conversions: 188, revenue: 282.0, payout: 197.4, profit: 84.6 },
      { date: "2025-10-09", partner: "Mob13r", clicks: 2902, conversions: 87, revenue: 43.5, payout: 30.45, profit: 13.05 },
      { date: "2025-10-08", partner: "Tapflow", clicks: 4505, conversions: 83, revenue: 41.5, payout: 29.05, profit: 12.45 },
    ];
    res.json(reports);
  } catch (err) {
    console.error("Error fetching reports:", err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// ✅ Admin root check
router.get("/", (req, res) => res.send("Admin API running 🚀"));

export default router;
