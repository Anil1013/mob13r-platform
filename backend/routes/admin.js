import express from "express";
const router = express.Router();

// ✅ Reports API
router.get("/reports", async (req, res) => {
  try {
    const reports = [
      {
        date: "2025-10-14",
        partnerServId: 252,
        publisherCampaignId: 101,
        partner: "Partner 1",
        affiliate: "Affiliate 4",
        geo: "OM",
        carrier: "Omantel",
        clicks: 4393,
        partnerConversions: 192,
        affiliateConversions: 96,
        revenue: 67.2,
        costToAffiliate: 28.8,
        profit: 38.4,
      },
      {
        date: "2025-10-13",
        partnerServId: 251,
        publisherCampaignId: 115,
        partner: "Partner 2",
        affiliate: "Affiliate 1",
        geo: "BH",
        carrier: "Batelco",
        clicks: 3812,
        partnerConversions: 112,
        affiliateConversions: 56,
        revenue: 39.2,
        costToAffiliate: 16.8,
        profit: 22.4,
      },
      {
        date: "2025-10-12",
        partnerServId: 258,
        publisherCampaignId: 110,
        partner: "Partner 3",
        affiliate: "Affiliate 2",
        geo: "IQ",
        carrier: "Asia cell",
        clicks: 3360,
        partnerConversions: 94,
        affiliateConversions: 47,
        revenue: 32.9,
        costToAffiliate: 14.1,
        profit: 18.8,
      },
      {
        date: "2025-10-11",
        partnerServId: 251,
        publisherCampaignId: 115,
        partner: "Partner 4",
        affiliate: "Affiliate 4",
        geo: "BH",
        carrier: "Batelco",
        clicks: 3050,
        partnerConversions: 121,
        affiliateConversions: 60.5,
        revenue: 42.35,
        costToAffiliate: 18.15,
        profit: 24.2,
      },
      {
        date: "2025-10-10",
        partnerServId: 252,
        publisherCampaignId: 101,
        partner: "Partner 1",
        affiliate: "Affiliate 3",
        geo: "OM",
        carrier: "Omantel",
        clicks: 4576,
        partnerConversions: 188,
        affiliateConversions: 82,
        revenue: 197.4,
        costToAffiliate: 84.6,
        profit: 112.8,
      },
      {
        date: "2025-10-09",
        partnerServId: 252,
        publisherCampaignId: 110,
        partner: "Partner 2",
        affiliate: "Affiliate 4",
        geo: "IQ",
        carrier: "Zain",
        clicks: 2902,
        partnerConversions: 87,
        affiliateConversions: 43.5,
        revenue: 30.45,
        costToAffiliate: 13.05,
        profit: 17.4,
      },
    ];

    res.json(reports);
  } catch (err) {
    console.error("Error fetching reports:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Partners API
router.get("/partners", (req, res) => {
  const partners = [
    { id: 1, name: "Partner 1" },
    { id: 2, name: "Partner 2" },
    { id: 3, name: "Partner 3" },
    { id: 4, name: "Partner 4" },
  ];
  res.json(partners);
});

// ✅ Affiliates API
router.get("/affiliates", (req, res) => {
  const affiliates = [
    { id: 1, name: "Affiliate 1" },
    { id: 2, name: "Affiliate 2" },
    { id: 3, name: "Affiliate 3" },
    { id: 4, name: "Affiliate 4" },
  ];
  res.json(affiliates);
});

// ✅ Offers API
router.get("/offers", (req, res) => {
  const offers = [
    { id: 101, name: "Offer 1 - Games" },
    { id: 110, name: "Offer 2 - Fitness" },
    { id: 115, name: "Offer 3 - Music" },
  ];
  res.json(offers);
});

export default router;
