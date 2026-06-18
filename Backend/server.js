import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import xlsx from "xlsx";

import {
  initStore,
  findUser,
  publicUser,
  verifyPassword,
  listUsers,
  setPassword,
  addOfficer,
  removeUser,
  DEFAULT_OFFICER_PASSWORD,
} from "./users.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret";
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || "8h";
const PDF_SAVE_FOLDER = process.env.PDF_SAVE_FOLDER
  ? path.resolve(process.env.PDF_SAVE_FOLDER)
  : path.resolve(__dirname, "saved-pdfs");
const EMPLOYEES_FILE = path.resolve(
  __dirname,
  process.env.EMPLOYEES_FILE || "./data/Employees.xlsx"
);

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Seed data/users.json on first run.
initStore();

/* ------------------------------------------------------------------ */
/*  Employees — read from the Excel workbook (cached after first read) */
/* ------------------------------------------------------------------ */

let employeesCache = null;

/** Normalise a header so "Employee ID", "emp_id", "ID" all map the same. */
function normalizeKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pick(row, candidates) {
  for (const key of Object.keys(row)) {
    if (candidates.includes(normalizeKey(key))) return row[key];
  }
  return "";
}

function loadEmployees() {
  if (employeesCache) return employeesCache;

  if (!fs.existsSync(EMPLOYEES_FILE)) {
    throw new Error(`Employees workbook not found at ${EMPLOYEES_FILE}`);
  }

  const workbook = xlsx.readFile(EMPLOYEES_FILE);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  employeesCache = rows
    .map((row) => ({
      id: String(pick(row, ["id", "empid", "employeeid", "gpid"])).trim(),
      name: String(pick(row, ["name", "empname", "employeename", "fullname"])).trim(),
      location: String(pick(row, ["location", "site", "office"])).trim(),
    }))
    .filter((e) => e.id);

  return employeesCache;
}

/* ------------------------------------------------------------------ */
/*  Auth                                                              */
/* ------------------------------------------------------------------ */

function authMiddleware(req, res, next) {
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

function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

/* ------------------------------------------------------------------ */
/*  Routes                                                            */
/* ------------------------------------------------------------------ */

app.post("/api/login", (req, res) => {
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
app.post("/api/change-password", authMiddleware, (req, res) => {
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

/* ---------- Admin-only: list users ---------- */
app.get("/api/admin/users", authMiddleware, adminOnly, (_req, res) => {
  res.json(listUsers());
});

/* ---------- Admin-only: reset another user's password ---------- */
app.post(
  "/api/admin/users/reset-password",
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

/* ---------- Admin-only: assign (create) a new RA officer ---------- */
app.post("/api/admin/users", authMiddleware, adminOnly, (req, res) => {
  const { username, label } = req.body || {};
  try {
    const user = addOfficer({ username, label });
    res.status(201).json({ user, defaultPassword: DEFAULT_OFFICER_PASSWORD });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ---------- Admin-only: remove a user's access ---------- */
app.delete("/api/admin/users", authMiddleware, adminOnly, (req, res) => {
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

app.get("/api/ra-officers", authMiddleware, (_req, res) => {
  res.json(
    listUsers()
      .filter((u) => u.role === "officer")
      .map((u) => ({ label: u.label, value: u.displayValue }))
  );
});

app.get("/api/employees", authMiddleware, (_req, res) => {
  try {
    res.json(loadEmployees());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

/* ---------- Save PDF to the configured OneDrive folder ---------- */
app.post("/api/save-pdf", authMiddleware, async (req, res) => {
  const { pdfBase64, fileName } = req.body || {};
  if (!pdfBase64 || !fileName) {
    return res.status(400).json({ error: "pdfBase64 and fileName are required" });
  }

  // Sanitise the filename — strip any path separators to prevent path traversal
  const safeName = path.basename(fileName).replace(/[/\\]/g, "_");
  if (!safeName.endsWith(".pdf")) {
    return res.status(400).json({ error: "fileName must end with .pdf" });
  }

  try {
    fs.mkdirSync(PDF_SAVE_FOLDER, { recursive: true });
    const dest = path.join(PDF_SAVE_FOLDER, safeName);
    const buffer = Buffer.from(pdfBase64, "base64");
    fs.writeFileSync(dest, buffer);
    res.json({ ok: true, path: dest });
  } catch (err) {
    console.error("save-pdf error:", err);
    res.status(500).json({ error: "Failed to save PDF: " + err.message });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Employees workbook: ${EMPLOYEES_FILE}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n⚠️  Port ${PORT} is already in use — another backend is still running.\n` +
        `   The existing server is fine; you do NOT need to start a second one.\n` +
        `   To restart cleanly, stop the old one first:\n` +
        `     Get-NetTCPConnection -LocalPort ${PORT} -State Listen | ` +
        `Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }\n`
    );
    process.exit(0);
  }
  throw err;
});
