import express from "express";

import { authMiddleware } from "../middleware/auth.js";
import {
  loadEmployees,
  getEmployeesStatus,
} from "../services/employeeService.js";

/**
 * employeeRoutes.js — Employee data and service health.
 */
const router = express.Router();

/* ---------- Employees ---------- */
router.get("/employees", authMiddleware, (_req, res) => {
  try {
    res.json(loadEmployees());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Health ---------- */
router.get("/health", (_req, res) =>
  res.json({ status: "ok", employees: getEmployeesStatus() })
);

export default router;
