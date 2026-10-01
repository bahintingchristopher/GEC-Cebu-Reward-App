// Shared input validators for the API.

// Email is stored normalised (trimmed + lowercased) so that the UNIQUE index
// treats "Ana@Gmail.com" and "ana@gmail.com" as the same account.
function normalizeEmail(value) {
  return String(value == null ? '' : value).trim().toLowerCase();
}

// Deliberately permissive: one @, something before it, a dotted domain after.
// The column is VARCHAR(191), so anything longer can never be saved anyway.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isValidEmail(value) {
  const email = normalizeEmail(value);
  if (!email || email.length > 191) return false;
  if (email.includes('..')) return false;
  return EMAIL_PATTERN.test(email);
}

module.exports = { normalizeEmail, isValidEmail };