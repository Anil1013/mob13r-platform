import jwt from "jsonwebtoken";
import pool from "../db.js";

export default async function orgAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: "No token" });
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "mob13r_secret");
    req.user = decoded;
    req.orgId = decoded.org_id || 1;
    if (decoded.org_id) {
      const org = await pool.query(
        "SELECT * FROM organizations WHERE id = $1",
        [decoded.org_id]
      );
      if (!org.rows.length) {
        return res.status(403).json({ error: "Organization inactive or not found" });
      }
      req.org = org.rows[0];

      // Trial expiry check: read-only mode after trial ends (starter plan only)
      const isWriteMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
      const trialExpired =
        req.org.plan === "starter" &&
        req.org.trial_ends_at &&
        new Date(req.org.trial_ends_at) < new Date();

      if (trialExpired && isWriteMethod) {
        return res.status(403).json({
          error: "TRIAL_EXPIRED",
          message: "Your 7-day free trial has ended. Please upgrade your plan to continue making changes."
        });
      }
    }
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
