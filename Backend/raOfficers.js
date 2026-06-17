/**
 * RA Officers — the only users allowed to access the application.
 *
 * Each officer logs in with their `username` (email) and `password`.
 * `displayValue` is the full signature block shown in the letter dropdown
 * (kept in sync with the frontend RA officer list).
 *
 * NOTE: For a real deployment, store hashed passwords (e.g. bcrypt) and load
 * them from a database or secrets manager instead of this file.
 */
const RA_OFFICERS = [
  {
    label: "Rai, Rohit",
    username: "rohit.rai@vwwgds.com",
    password: "vwgds@123",
    displayValue: "Rai, Rohit (Digital Solutions IN I-TT)\nrohit.rai@vwwgds.com",
  },
];

export default RA_OFFICERS;
