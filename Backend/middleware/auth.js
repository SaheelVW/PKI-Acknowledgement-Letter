import jwt from "jsonwebtoken";

import { JWT_SECRET } from "../config.js";

/**
 * auth.js — Express middleware for authentication & authorisation.
 */

/** Verify the Bearer JWT and attach the decoded payload to req.user. */
export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/** Require the authenticated user to have the admin role. */
export function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}
