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
      const orgRes = await pool.query(
        "SELECT * FROM organizations WHERE id = $1",
        [decoded.org_id]
      );
      if (!orgRes.rows.length) {
        return res.status(403).json({ error: "Organization not found" });
      }
      let orgData = orgRes.rows[0];

      if (orgData.status === "suspended") {
        return res.status(403).json({ error: "Organization suspended. Contact support." });
      }

      const isWriteMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);

      // Trial expiry check (starter plan only)
      const trialExpired =
        orgData.plan === "starter" &&
        orgData.trial_ends_at &&
        new Date(orgData.trial_ends_at) < new Date();

      // 30-day plan cycle expiry check
      const cycleExpired =
        orgData.plan_started_at &&
        (new Date() - new Date(orgData.plan_started_at)) / (1000 * 60 * 60 * 24) >= 30;

      // Monthly conversion limit cross check
      const convCheck = await pool.query(
        `SELECT COUNT(*)::int AS count FROM pin_sessions
         WHERE org_id = $1
         AND status IN ('VERIFIED','SCRUBBED','CAP_REACHED')
         AND parent_session_token IS NOT NULL
         AND created_at >= $2`,
        [orgData.id, orgData.plan_started_at || orgData.created_at]
      );
      const limitCrossed = convCheck.rows[0].count >= orgData.monthly_conversions;

      // Auto-mark as pending if cycle ended or limit crossed
      if ((cycleExpired || limitCrossed) && orgData.status === "active") {
        const updated = await pool.query(
          `UPDATE organizations SET status='pending' WHERE id=$1 RETURNING *`,
          [orgData.id]
        );
        orgData = updated.rows[0];
      }

      req.org = orgData;

      const renewalRequired = orgData.status === "pending" || trialExpired;

      if (renewalRequired && isWriteMethod) {
        return res.status(403).json({
          error: "RENEWAL_REQUIRED",
          message: trialExpired
            ? "Your 7-day free trial has ended. Please upgrade your plan to continue making changes."
            : "Your plan cycle has ended or usage limit reached. Please contact admin to renew."
        });
      }
    }

    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
