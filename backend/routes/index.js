import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "Backend API running ✅" });
});

// ✅ Dashboard route for frontend
router.get("/dashboard", async (req, res) => {
  try {
    const publisherCount = await req.db.Publisher.count();
    const advertiserCount = await req.db.Advertiser.count();

    res.json({
      success: true,
      data: {
        publishers: publisherCount,
        advertisers: advertiserCount,
      },
    });
  } catch (err) {
    console.error("❌ Dashboard API error:", err);
    res.status(500).json({ success: false, message: "Backend error" });
  }
});

export default router;
