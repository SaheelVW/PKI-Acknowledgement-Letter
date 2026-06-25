import express from "express";
import jwt from "jsonwebtoken";

import { JWT_SECRET, TOKEN_EXPIRY } from "../config.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  findUser,
  publicUser,
  verifyPassword,
  setPassword,
} from "../users.js";

/**
 * authRoutes.js — Login and self-service password change.
 */
const router = express.Router();

/* ---------- Login ---------- */
router.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const user = findUser(username);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { username: user.username, label: user.label, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );

  res.json({ token, officer: publicUser(user) });
});

/* ---------- Change own password (any logged-in user) ---------- */
router.post("/change-password", authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "Current and new password are required" });
  }
  if (String(newPassword).length < 6) {
    return res
      .status(400)
      .json({ error: "New password must be at least 6 characters" });
  }

  const user = findUser(req.user.username);
  if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  setPassword(user.username, newPassword);
  res.json({ ok: true });
});

export default router;
