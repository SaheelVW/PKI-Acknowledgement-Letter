import express from "express";
import fs from "node:fs";

import { authMiddleware } from "../middleware/auth.js";
import {
  listLetters,
  resolveLetterFile,
  saveLetterPdf,
} from "../services/letterService.js";

/**
 * letterRoutes.js — List, open and save acknowledgment letter PDFs.
 */
const router = express.Router();

/* ---------- List letters (optionally filtered by employee ID) ---------- */
router.get("/letters", authMiddleware, (req, res) => {
  try {
    res.json(listLetters(req.query.empId));
  } catch (err) {
    console.error("list letters error:", err);
    res.status(500).json({ error: "Failed to list letters: " + err.message });
  }
});

/* ---------- Download / open a single saved letter PDF ---------- */
router.get("/letters/file", authMiddleware, (req, res) => {
  try {
    const { safeName, filePath } = resolveLetterFile(req.query.name);
    res.type("application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/* ---------- Save PDF to the configured OneDrive folder ---------- */
router.post("/save-pdf", authMiddleware, (req, res) => {
  const { pdfBase64, fileName } = req.body || {};
  try {
    const dest = saveLetterPdf(pdfBase64, fileName);
    res.json({ ok: true, path: dest });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error("save-pdf error:", err);
    res.status(500).json({ error: "Failed to save PDF: " + err.message });
  }
});

export default router;
