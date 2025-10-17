import express from "express";
const router = express.Router();

// ✅ Mock Reports Endpoint
router.get("/reports", async (req, res) => {
  try {
    const reports = [
      {
        date: "2025-10-14",
        partner_service_id: 252,
        publisher_campaign_id: 101,
        partner: "Partner 1",
        affiliate: "Affiliate 4",
        geo: "OM",
        carrier: "Omantel",
        partner_service_name: "Game 1",
        clicks: 4393,
        partner_conversions: 192,
        affiliate_conversions: 96,
        revenue: 67.2,
        cost_to_affiliate: 28.8,
        profit: 38.4,
      },
      {
        date: "2025-10-13",
        partner_service_id: 251,
        publisher_campaign_id: 115,
        partner: "Partner 2",
        affiliate: "Affiliate 1",
        geo: "BH",
        carrier: "Batelco",
        partner_service_name: "BALADNA",
        clicks: 3812,
        partner_conversions: 112,
        affiliate_conversions: 56,
        revenue: 39.2,
        cost_to_affiliate: 16.8,
        profit: 22.4,
      },
      {
        date: "2025-10-12",
        partner_service_id: 258,
        publisher_campaign_id: 110,
        partner: "Partner 3",
        affiliate: "Affiliate 2",
        geo: "IQ",
        carrier: "Asia cell",
        partner_service_name: "Prizes",
        clicks: 3360,
        partner_conversions: 94,
        affiliate_conversions: 47,
        revenue: 32.9,
        cost_to_affiliate: 14.1,
        profit: 18.8,
      },
      {
        date: "2025-10-11",
        partner_service_id: 251,
        publisher_campaign_id: 115,
        partner: "Partner 4",
        affiliate: "Affiliate 4",
        geo: "BH",
        carrier: "Batelco",
        partner_service_name: "BALADNA",
        clicks: 3050,
        partner_conversions: 121,
        affiliate_conversions: 60.5,
        revenue: 42.35,
        cost_to_affiliate: 18.15,
        profit: 24.2,
      },
      {
        date: "2025-10-10",
        partner_service_id: 252,
        publisher_campaign_id: 101,
        partner: "Partner 1",
        affiliate: "Affiliate 3",
        geo: "OM",
        carrier: "Omantel",
        partner_service_name: "Game 1",
        clicks: 4576,
        partner_conversions: 188,
        affiliate_conversions: 282,
        revenue: 197.4,
        cost_to_affiliate: 84.6,
        profit: 112.8,
      },
      {
        date: "2025-10-09",
        partner_service_id: 252,
        publisher_campaign_id: 110,
        partner: "Partner 2",
        affiliate: "Affiliate 4",
        geo: "IQ",
        carrier: "Zain",
        partner_service_name: "Playnew",
        clicks: 2902,
        partner_conversions: 87,
        affiliate_conversions: 43.5,
        revenue: 30.45,
        cost_to_affiliate: 13.05,
        profit: 17.4,
      },
    ];

    res.json(reports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// ✅ Partners Endpoint
router.get("/partners", (req, res) => {
  res.json([
    { id: 1, name: "Partner 1", country: "OM", status: "Active" },
    { id: 2, name: "Partner 2", country: "BH", status: "Active" },
    { id: 3, name: "Partner 3", country: "IQ", status: "Active" },
    { id: 4, name: "Partner 4", country: "OM", status: "Inactive" },
  ]);
});

// ✅ Affiliates Endpoint
router.get("/affiliates", (req, res) => {
  res.json([
    { id: 1, name: "Affiliate 1", region: "Middle East", status: "Active" },
    { id: 2, name: "Affiliate 2", region: "Asia", status: "Active" },
    { id: 3, name: "Affiliate 3", region: "GCC", status: "Active" },
    { id: 4, name: "Affiliate 4", region: "GCC", status: "Inactive" },
  ]);
});

// ✅ Offers Endpoint
router.get("/offers", (req, res) => {
  res.json([
    { id: 1, name: "Game 1", price: 1.3, operator: "Omantel", country: "OM" },
    { id: 2, name: "BALADNA", price: 1.0, operator: "Batelco", country: "BH" },
    { id: 3, name: "Prizes", price: 1.5, operator: "Asia cell", country: "IQ" },
    { id: 4, name: "Playnew", price: 1.2, operator: "Zain", country: "IQ" },
  ]);
});

export default router;
