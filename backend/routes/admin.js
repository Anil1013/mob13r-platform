import express from "express";

const router = express.Router();

/* =========================================
   ✅ Health Check
========================================= */
router.get("/", (req, res) => {
  res.send("Admin API is running 🚀");
});

/* =========================================
   ✅ Partners Endpoint
========================================= */
router.get("/partners", async (req, res) => {
  try {
    const partners = [
      { id: 1, name: "SEL Telecom", country: "Oman", status: "Active" },
      { id: 2, name: "Ooredoo", country: "Qatar", status: "Active" },
      { id: 3, name: "Omantel", country: "Oman", status: "Active" },
      { id: 4, name: "Mobily", country: "Saudi Arabia", status: "Inactive" },
    ];
    res.json(partners);
  } catch (error) {
    console.error("Error fetching partners:", error);
    res.status(500).json({ error: "Failed to fetch partners" });
  }
});

/* =========================================
   ✅ Affiliates Endpoint
========================================= */
router.get("/affiliates", async (req, res) => {
  try {
    const affiliates = [
      { id: 101, name: "AdNetworkX", region: "MENA", traffic: "Web", status: "Active" },
      { id: 102, name: "ClickBoost", region: "India", traffic: "App", status: "Active" },
      { id: 103, name: "SmartMedia", region: "Global", traffic: "Web+App", status: "Inactive" },
    ];
    res.json(affiliates);
  } catch (error) {
    console.error("Error fetching affiliates:", error);
    res.status(500).json({ error: "Failed to fetch affiliates" });
  }
});

/* =========================================
   ✅ Offers Endpoint
========================================= */
router.get("/offers", async (req, res) => {
  try {
    const offers = [
      { id: 201, name: "Games Weekly", price: 1.3, operator: "Omantel", validity: "7 Days" },
      { id: 202, name: "Music Pack", price: 0.8, operator: "Ooredoo", validity: "Daily" },
      { id: 203, name: "Video Plus", price: 1.5, operator: "SEL Telecom", validity: "Weekly" },
    ];
    res.json(offers);
  } catch (error) {
    console.error("Error fetching offers:", error);
    res.status(500).json({ error: "Failed to fetch offers" });
  }
});

/* =========================================
   ✅ Reports Endpoint
========================================= */
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
