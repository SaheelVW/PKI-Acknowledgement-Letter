/**
 * Generate a random 16-character GID (uppercase letters + digits).
 */
export function generateGID() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return [...Array(16)]
    .map(() => chars[Math.floor(Math.random() * 36)])
    .join("");
}

/**
 * Format a date string (YYYY-MM-DD) to en-GB locale (DD/MM/YYYY).
 */
export function formatDate(value) {
  if (!value) return "[Date]";
  return new Intl.DateTimeFormat("en-GB").format(new Date(value));
}

/**
 * Get today's date as YYYY-MM-DD for input[type="date"] default value.
 */
export function getTodayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
