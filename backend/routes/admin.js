import express from "express";
import { sequelize, initModels } from "../models.js";

const router = express.Router();
const { Partner, Offer, Affiliate } = initModels();

/**
 * ✅ Get all partners
 */
router.get("/partners", async (req, res) => {
  try {
    const partners = await Partner.findAll();
    res.json(partners);
  } catch (error) {
    console.error("Error fetching partners:", error);
    res.status(500).json({ error: "Failed to fetch partners" });
  }
});

/**
 * ✅ Get all affiliates (hide password)
 */
router.get("/affiliates", async (req, res) => {
  try {
    const affiliates = await Affiliate.findAll({
      attributes: { exclude: ["password"] },
    });
    res.json(affiliates);
  } catch (error) {
    console.error("Error fetching affiliates:", error);
    res.status(500).json({ error: "Failed to fetch affiliates" });
  }
});

/**
 * ✅ Get all offers (with partner info)
 */
router.get("/offers", async (req, res) => {
  try {
    const offers = await Offer.findAll({ include: [Partner] });
    res.json(offers);
  } catch (error) {
    console.error("Error fetching offers:", error);
    res.status(500).json({ error: "Failed to fetch offers" });
  }
});

/**
 * ✅ Reports Endpoint
 * Supports:
 *  - fromDate / toDate filters
 *  - hourly=true (for hourly breakdown)
 *  - partners=1,2,3 (filter by multiple partner IDs)
 */
router.get("/reports", async (req, res) => {
  try {
    const { fromDate, toDate, hourly, partners } = req.query;

    // Build where conditions
    const whereClause = {};
    if (fromDate && toDate) {
      whereClause.date = { [sequelize.Op.between]: [fromDate, toDate] };
    }

    if (partners) {
      const partnerArray = partners.split(",").filter((id) => id);
      if (partnerArray.length > 0) {
        whereClause.partner_id = partnerArray;
      }
    }

    // Mock Data (You can replace this with your real analytics table)
    const mockData = generateMockReport({
      fromDate,
      toDate,
      hourly,
      partners: partners ? partners.split(",") : [],
    });

    res.json(mockData);
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

/**
 * 🧠 Mock function — Replace this later with your analytics data query
 */
function generateMockReport({ fromDate, toDate, hourly, partners }) {
  const results = [];
  const start = fromDate ? new Date(fromDate) : new Date("2025-10-01");
  const end = toDate ? new Date(toDate) : new Date("2025-10-14");

  const hoursOrDays = hourly ? 24 : Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  const partnerIds = partners.length > 0 ? partners : ["1", "2", "3"];

  for (let pid of partnerIds) {
    for (let i = 0; i < hoursOrDays; i++) {
      const date = new Date(start);
      if (hourly) date.setHours(i);
      else date.setDate(start.getDate() + i);

      const clicks = Math.floor(Math.random() * 1000 + 100);
      const conversions = Math.floor(clicks * 0.2);
      const revenue = conversions * 1.5;
      const payout = conversions * 1.0;
      const profit = revenue - payout;

      results.push({
        date: hourly ? `${date.getHours()}:00` : date.toISOString().split("T")[0],
        partner_id: pid,
        partner_name: `Partner ${pid}`,
        clicks,
        conversions,
        revenue,
        payout,
        profit,
        [`partner_${pid}_conversions`]: conversions,
      });
    }
  }

  return results;
}

/**
 * ✅ Create Offer
 */
router.post("/offers", async (req, res) => {
  try {
    const { name, geo, carrier, partner_id, partner_cpa, ref_url, request_url, verify_url } =
      req.body;

    if (!name || !partner_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newOffer = await Offer.create({
      name,
      geo,
      carrier,
      PartnerId: partner_id,
      partner_cpa,
      ref_url,
      request_url,
      verify_url,
      status: "active",
    });

    res.status(201).json(newOffer);
  } catch (error) {
    console.error("Error creating offer:", error);
    res.status(500).json({ error: "Failed to create offer" });
  }
});

/**
 * ✅ Delete Offer
 */
router.delete("/offers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Offer.destroy({ where: { id } });
    if (!deleted) {
      return res.status(404).json({ error: "Offer not found" });
    }
    res.json({ message: "Offer deleted successfully" });
  } catch (error) {
    console.error("Error deleting offer:", error);
    res.status(500).json({ error: "Failed to delete offer" });
  }
});

export default router;
