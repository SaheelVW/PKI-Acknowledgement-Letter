import express from "express";

import { authMiddleware, adminOnly } from "../middleware/auth.js";
import {
  listUsers,
  setPassword,
  addOfficer,
  removeUser,
  DEFAULT_OFFICER_PASSWORD,
} from "../users.js";

/**
 * adminRoutes.js — Admin-only user management plus the RA officer lookup.
 */
const router = express.Router();

/* ---------- List all app users ---------- */
router.get("/admin/users", authMiddleware, adminOnly, (_req, res) => {
  res.json(listUsers());
});

/* ---------- Reset another user's password ---------- */
router.post(
  "/admin/users/reset-password",
  authMiddleware,
  adminOnly,
  (req, res) => {
    const { username, newPassword } = req.body || {};
    if (!username || !newPassword) {
      return res
        .status(400)
        .json({ error: "Username and new password are required" });
    }
    if (String(newPassword).length < 6) {
      return res
        .status(400)
        .json({ error: "New password must be at least 6 characters" });
    }

    const ok = setPassword(username, newPassword);
    if (!ok) return res.status(404).json({ error: "User not found" });
    res.json({ ok: true });
  }
);

/* ---------- Assign (create) a new RA officer ---------- */
router.post("/admin/users", authMiddleware, adminOnly, (req, res) => {
  const { username, label } = req.body || {};
  try {
    const user = addOfficer({ username, label });
    res.status(201).json({ user, defaultPassword: DEFAULT_OFFICER_PASSWORD });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ---------- Remove a user's access ---------- */
router.delete("/admin/users", authMiddleware, adminOnly, (req, res) => {
  const { username } = req.body || {};
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }
  try {
    const ok = removeUser(username);
    if (!ok) return res.status(404).json({ error: "User not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
