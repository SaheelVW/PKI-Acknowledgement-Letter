import fs from "node:fs";
import path from "node:path";

import { PDF_SAVE_FOLDER } from "../config.js";

/**
 * letterService.js — List, read and save acknowledgment letter PDFs stored in
 * the configured OneDrive-synced folder.
 */

/**
 * Parse a saved PDF name of the form
 *   PKI_{empName}_{empId}[_SOFT_TOKEN][_YYYYMMDD-HHMMSS].pdf
 * and return { empId, tokenType, stampDate } (best-effort).
 */
export function parseLetterName(fileName) {
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
export function listLetters(empIdQuery = "") {
  const query = String(empIdQuery || "").trim().toLowerCase();

  if (!fs.existsSync(PDF_SAVE_FOLDER)) {
    return [];
  }

  return fs
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
}

/**
 * Resolve a requested file name to a safe path inside PDF_SAVE_FOLDER.
 * Returns { safeName, filePath } or throws an Error with a `.status` property.
 */
export function resolveLetterFile(requested) {
  // Prevent path traversal — only allow a plain file name.
  const safeName = path.basename(String(requested || ""));
  if (!safeName.toLowerCase().endsWith(".pdf")) {
    const err = new Error("Invalid file name");
    err.status = 400;
    throw err;
  }

  const filePath = path.join(PDF_SAVE_FOLDER, safeName);
  if (!fs.existsSync(filePath)) {
    const err = new Error("File not found");
    err.status = 404;
    throw err;
  }

  return { safeName, filePath };
}

/**
 * Save a base64-encoded PDF to PDF_SAVE_FOLDER.
 * Returns the absolute path written. Throws an Error with `.status` on bad input.
 */
export function saveLetterPdf(pdfBase64, fileName) {
  if (!pdfBase64 || !fileName) {
    const err = new Error("pdfBase64 and fileName are required");
    err.status = 400;
    throw err;
  }

  // Sanitise the filename — strip any path separators to prevent path traversal.
  const safeName = path.basename(fileName).replace(/[/\\]/g, "_");
  if (!safeName.endsWith(".pdf")) {
    const err = new Error("fileName must end with .pdf");
    err.status = 400;
    throw err;
  }

  fs.mkdirSync(PDF_SAVE_FOLDER, { recursive: true });
  const dest = path.join(PDF_SAVE_FOLDER, safeName);
  fs.writeFileSync(dest, Buffer.from(pdfBase64, "base64"));
  return dest;
}
