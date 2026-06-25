import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * config.js — Centralised environment configuration and constants.
 *
 * All values are read from environment variables (loaded via `dotenv/config`
 * in server.js) with sensible development defaults.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PORT = process.env.PORT || 4000;
export const HOST = process.env.HOST || "127.0.0.1";

export const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret";
export const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || "8h";

export const PDF_SAVE_FOLDER = process.env.PDF_SAVE_FOLDER
  ? path.resolve(process.env.PDF_SAVE_FOLDER)
  : path.resolve(__dirname, "saved-pdfs");

export const EMPLOYEES_FILE = path.resolve(
  __dirname,
  process.env.EMPLOYEES_FILE || "./data/Employees.xlsx"
);

export const EMPLOYEE_REFRESH_INTERVAL_MS = Number(
  process.env.EMPLOYEE_REFRESH_INTERVAL_MS || 5 * 60 * 1000
);
