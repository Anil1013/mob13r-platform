// backend/src/middleware/fraudCheck.js

export default async function fraudCheck(req, res, next) {
  try {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;
    const ua = req.headers["user-agent"] || "";
    const pub = req.query.pub_id || "UNKNOWN";

    console.log(`🔎 FraudCheck → PUB: ${pub} | IP: ${ip} | UA: ${ua}`);

    // Example rule: block empty UA
    if (!ua || ua.length < 5) {
      console.log("🚫 FraudCheck → Blocked (Invalid UA)");
      return res.redirect("https://google.com");
    }

    next();
  } catch (err) {
    console.error("❌ FraudCheck Error:", err);
    next(); // FAIL-OPEN → NEVER BREAK CORS or API
  }
}
