import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import RA_OFFICERS from "./raOfficers.js";
import ADMINS from "./admins.js";

/**
 * users.js — Credential store for the app.
 *
 * All login IDs and (hashed) passwords live in `data/users.json`.
 * Passwords are never stored in plain text — they are hashed with scrypt
 * and a per-user random salt (format: "salt:hash", both hex).
 *
 * On first run the store is seeded from raOfficers.js (role: "officer")
 * plus one bootstrap admin account (configurable via env).
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.resolve(__dirname, "./data/users.json");

/* ------------------------------ hashing ------------------------------ */

export function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(plain), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(plain, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const candidate = crypto.scryptSync(String(plain), salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(candidate, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ------------------------------ storage ------------------------------ */

function readStore() {
  const raw = fs.readFileSync(USERS_FILE, "utf-8");
  return JSON.parse(raw);
}

function writeStore(users) {
  fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

/** Seed users.json the first time the server runs. */
export function initStore() {
  if (fs.existsSync(USERS_FILE)) return;

  const officers = RA_OFFICERS.map((o) => ({
    username: o.username.toLowerCase(),
    label: o.label,
    role: "officer",
    displayValue: o.displayValue,
    passwordHash: hashPassword(o.password),
  }));

  const admins = ADMINS.map((a) => ({
    username: a.username.toLowerCase(),
    label: a.label,
    role: "admin",
    displayValue: `${a.label} (Digital Solutions IN I-TT)\n${a.username}`,
    passwordHash: hashPassword(a.password),
  }));

  writeStore([...admins, ...officers]);
  console.log(
    `Seeded ${USERS_FILE} (admins: ${admins.map((a) => a.username).join(", ")})`
  );
}

/* ------------------------------ queries ------------------------------ */

export function findUser(username) {
  if (!username) return null;
  const target = String(username).trim().toLowerCase();
  return readStore().find((u) => u.username === target) || null;
}

/** Public-safe user shape (no password hash). */
export function publicUser(u) {
  if (!u) return null;
  return {
    username: u.username,
    label: u.label,
    role: u.role,
    displayValue: u.displayValue,
  };
}

export function listUsers() {
  return readStore().map(publicUser);
}

/** Update a user's password. Returns true if the user existed. */
export function setPassword(username, newPlainPassword) {
  const users = readStore();
  const target = String(username).trim().toLowerCase();
  const user = users.find((u) => u.username === target);
  if (!user) return false;
  user.passwordHash = hashPassword(newPlainPassword);
  writeStore(users);
  return true;
}

/** Default password assigned to newly created RA officers. */
export const DEFAULT_OFFICER_PASSWORD = "vwgds@12345";

/**
 * Create a new RA officer. Throws if the username already exists.
 * The account is given DEFAULT_OFFICER_PASSWORD.
 */
export function addOfficer({ username, label }) {
  const users = readStore();
  const target = String(username || "").trim().toLowerCase();
  if (!target) throw new Error("Username (email) is required");
  if (!label || !String(label).trim()) throw new Error("Name is required");
  if (users.some((u) => u.username === target)) {
    throw new Error("A user with that email already exists");
  }

  const cleanLabel = String(label).trim();
  const newUser = {
    username: target,
    label: cleanLabel,
    role: "officer",
    displayValue: `${cleanLabel} (Digital Solutions IN I-TT)\n${target}`,
    passwordHash: hashPassword(DEFAULT_OFFICER_PASSWORD),
  };

  users.push(newUser);
  writeStore(users);
  return publicUser(newUser);
}

/**
 * Remove a user (revoke access). Admins cannot be deleted.
 * Returns true if a user was removed.
 */
export function removeUser(username) {
  const users = readStore();
  const target = String(username || "").trim().toLowerCase();
  const user = users.find((u) => u.username === target);
  if (!user) return false;
  if (user.role === "admin") {
    throw new Error("Admin accounts cannot be removed");
  }
  writeStore(users.filter((u) => u.username !== target));
  return true;
}
