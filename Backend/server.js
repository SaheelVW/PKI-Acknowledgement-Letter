import "dotenv/config";

import express from "express";
import cors from "cors";

import { PORT, HOST, EMPLOYEES_FILE } from "./config.js";
import { initStore } from "./users.js";
import { startEmployeesAutoRefresh } from "./services/employeeService.js";

import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import letterRoutes from "./routes/letterRoutes.js";

/**
 * server.js — Main entry point.
 *
 * Builds the Express app, wires up the API routes (which delegate to the
 * services), and starts the HTTP server.
 */

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Seed data/users.json on first run.
initStore();

/* ---------- API routes ---------- */
app.use("/api", authRoutes);
app.use("/api", adminRoutes);
app.use("/api", employeeRoutes);
app.use("/api", letterRoutes);

// Warm the employee cache and keep it fresh.
startEmployeesAutoRefresh();

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
