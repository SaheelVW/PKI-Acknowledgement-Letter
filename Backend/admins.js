/**
 * Admin accounts — these users get admin access (assign / remove RA officers).
 *
 * Seeded into data/users.json on first run with the password below.
 * Each admin can change their own password after logging in.
 */
const ADMINS = [
  {
    label: "Waghmode, Anil",
    username: "anil.waghmode@vwgds.in",
    password: "admin@123",
  },
  {
    label: "Attarde, Tejashri",
    username: "tejashri.attarde@vwgds.in",
    password: "admin@123",
  },
];

export default ADMINS;
