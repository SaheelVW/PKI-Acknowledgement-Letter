import fs from "node:fs";

import xlsx from "xlsx";

import { EMPLOYEES_FILE, EMPLOYEE_REFRESH_INTERVAL_MS } from "../config.js";

/**
 * employeeService.js — Resilient Excel loading with stale-cache fallback.
 *
 * Reads the employees workbook, caches the result, and re-reads only when the
 * file changes on disk (e.g. the daily OneDrive update). If the file is
 * temporarily locked/syncing, the last known good cache is served instead of
 * failing requests.
 */

let employeesCache = null;
let employeesMtimeMs = 0;
let employeesLastError = "";
let employeesLastLoadedAt = null;

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

function parseEmployeesWorkbook(workbookPath) {
  const workbook = xlsx.readFile(workbookPath);
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Employees workbook has no sheets");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  return rows
    .map((row) => ({
      id: String(pick(row, ["id", "empid", "employeeid", "gpid"])).trim(),
      name: String(pick(row, ["name", "empname", "employeename", "fullname"])).trim(),
      location: String(pick(row, ["location", "site", "office"])).trim(),
    }))
    .filter((e) => e.id);
}

export function loadEmployees() {
  try {
    if (!fs.existsSync(EMPLOYEES_FILE)) {
      throw new Error(`Employees workbook not found at ${EMPLOYEES_FILE}`);
    }

    // Re-read whenever file content changes (OneDrive sync updates mtime).
    const mtimeMs = fs.statSync(EMPLOYEES_FILE).mtimeMs;
    if (employeesCache && mtimeMs === employeesMtimeMs) {
      return employeesCache;
    }

    const parsed = parseEmployeesWorkbook(EMPLOYEES_FILE);
    if (parsed.length === 0) {
      throw new Error("Employees workbook is empty or missing required columns");
    }

    employeesCache = parsed;
    employeesMtimeMs = mtimeMs;
    employeesLastLoadedAt = new Date().toISOString();
    employeesLastError = "";
    return employeesCache;
  } catch (err) {
    // If OneDrive is temporarily syncing/locking the file, keep serving
    // last known good data instead of failing requests.
    employeesLastError = err.message;
    if (employeesCache) {
      console.warn(
        `[employees] Using stale cache due to read error: ${err.message}`
      );
      return employeesCache;
    }
    throw err;
  }
}

/** Diagnostic status used by the health endpoint. */
export function getEmployeesStatus() {
  return {
    cached: Boolean(employeesCache),
    count: employeesCache?.length || 0,
    lastLoadedAt: employeesLastLoadedAt,
    lastError: employeesLastError || null,
  };
}

/** Warm the cache at startup and refresh it on an interval. */
export function startEmployeesAutoRefresh() {
  try {
    loadEmployees();
    console.log(
      `[employees] Cache loaded (${employeesCache?.length || 0} records) from ${EMPLOYEES_FILE}`
    );
  } catch (err) {
    console.warn(`[employees] Initial load failed: ${err.message}`);
  }

  if (
    !Number.isFinite(EMPLOYEE_REFRESH_INTERVAL_MS) ||
    EMPLOYEE_REFRESH_INTERVAL_MS <= 0
  ) {
    console.log("[employees] Auto-refresh disabled (EMPLOYEE_REFRESH_INTERVAL_MS <= 0)");
    return;
  }

  setInterval(() => {
    try {
      loadEmployees();
    } catch (err) {
      // loadEmployees already falls back to cache when possible.
      console.warn(`[employees] Refresh failed: ${err.message}`);
    }
  }, EMPLOYEE_REFRESH_INTERVAL_MS);

  console.log(
    `[employees] Auto-refresh every ${Math.round(EMPLOYEE_REFRESH_INTERVAL_MS / 1000)}s`
  );
}
