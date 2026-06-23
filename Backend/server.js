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
let employeesMtimeMs = 0;

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
  if (!fs.existsSync(EMPLOYEES_FILE)) {
    throw new Error(`Employees workbook not found at ${EMPLOYEES_FILE}`);
  }

  // Re-read the workbook whenever the file changes on disk (e.g. the daily
  // OneDrive update) so the data never goes stale, but stay cached otherwise.
  const mtimeMs = fs.statSync(EMPLOYEES_FILE).mtimeMs;
  if (employeesCache && mtimeMs === employeesMtimeMs) {
    return employeesCache;
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

  employeesMtimeMs = mtimeMs;
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

/* ------------------------------------------------------------------ */
/*  Signed acknowledgment letters — list & download saved PDFs        */
/* ------------------------------------------------------------------ */

/**
 * Parse a saved PDF name of the form
 *   PKI_{empName}_{empId}[_SOFT_TOKEN][_YYYYMMDD-HHMMSS].pdf
 * and return { empId, tokenType, stampDate } (best-effort).
 */
function parseLetterName(fileName) {
  let base = fileName.replace(/\.pdf$/i, "");

  // Trailing timestamp (YYYYMMDD-HHMMSS), if present.
  let stampDate = null;
  const stampMatch = base.match(/_(\d{8})-(\d{6})$/);
  if (stampMatch) {
    const [, ymd, hms] = stampMatch;
    const iso =
      `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}` +
      `T${hms.slice(0, 2)}:${hms.slice(2, 4)}:${hms.slice(4, 6)}`;
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) stampDate = parsed.toISOString();
    base = base.slice(0, stampMatch.index);
  }

  let tokenType = "";
  if (/_SOFT_TOKEN$/i.test(base)) {
    tokenType = "SOFT TOKEN";
    base = base.replace(/_SOFT_TOKEN$/i, "");
  }
  // empId is the last underscore-separated segment.
  const empId = base.includes("_") ? base.slice(base.lastIndexOf("_") + 1) : "";
  return { empId, tokenType, stampDate };
}

/** List acknowledgment letters, optionally filtered by employee ID. */
app.get("/api/letters", authMiddleware, (req, res) => {
  const query = String(req.query.empId || "").trim().toLowerCase();

  try {
    if (!fs.existsSync(PDF_SAVE_FOLDER)) {
      return res.json([]);
    }

    const letters = fs
      .readdirSync(PDF_SAVE_FOLDER)
      .filter((name) => name.toLowerCase().endsWith(".pdf"))
      .map((name) => {
        const { empId, tokenType, stampDate } = parseLetterName(name);
        const stat = fs.statSync(path.join(PDF_SAVE_FOLDER, name));
        return {
          fileName: name,
          empId,
          tokenType,
          date: stampDate || stat.mtime.toISOString(),
        };
      })
      .filter((l) => !query || l.empId.toLowerCase() === query)
      .sort((a, b) => b.date.localeCompare(a.date));

    res.json(letters);
  } catch (err) {
    console.error("list letters error:", err);
    res.status(500).json({ error: "Failed to list letters: " + err.message });
  }
});

/** Download / open a single saved letter PDF. */
app.get("/api/letters/file", authMiddleware, (req, res) => {
  const requested = String(req.query.name || "");
  // Prevent path traversal — only allow a plain file name.
  const safeName = path.basename(requested);
  if (!safeName.toLowerCase().endsWith(".pdf")) {
    return res.status(400).json({ error: "Invalid file name" });
  }

  const filePath = path.join(PDF_SAVE_FOLDER, safeName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  res.type("application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
  fs.createReadStream(filePath).pipe(res);
});

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

const HOST = process.env.HOST || "127.0.0.1";

const server = app.listen(PORT, HOST, () => {
  console.log(`Backend running on http://${HOST}:${PORT}`);
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
