import jwt from "jsonwebtoken";

export const SUPER_ADMIN_EMAIL = "admin@mob13r.com";

// Platform-owner-only guard. IMPORTANT: this must NOT accept role === "owner" —
// every org's own signup user gets role='owner' (see saas/auth.routes.js), so
// that check previously let ANY customer call these endpoints directly and
// view/edit/delete every other organization's data.
export default function isSuperAdmin(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.email !== SUPER_ADMIN_EMAIL) {
      return res.status(403).json({ error: "Super admin only" });
    }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
