/**
 * Pretty-print phone numbers for UI (sidebar, labels).
 * Always shows the country code.
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone?.trim()) return "";
  const raw = phone.trim();
  const digits = raw.replace(/\D/g, "");

  // US / Canada 11 digits (1 + 10): +1 (AAA) BBB-CCCC
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // US / Canada 10 digits (no country code): assume +1
  if (digits.length === 10) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Any other number with + prefix: keep the + and group digits
  if (raw.startsWith("+") && digits.length > 0) {
    return "+" + digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
  }

  // Fallback: just show as-is
  return raw;
}

/** Matrix localpart from phone signup, e.g. p17147570649 — not a display name. */
export function isPhoneDerivedLocalpart(firstName: string | undefined): boolean {
  if (!firstName?.trim()) return false;
  return /^p\d+$/i.test(firstName.trim());
}

/** Matrix user id localpart, e.g. `@p17147570649:domain` → `p17147570649`. */
export function matrixLocalpart(matrixUserId: string | null | undefined): string {
  if (!matrixUserId?.trim()) return "";
  return matrixUserId.replace(/^@/, "").split(":")[0];
}

/**
 * For profile UI: treat auto-filled Matrix username / phone localpart as empty first name.
 */
export function sanitizeFirstNameForForm(
  firstName: string | undefined,
  matrixUserId: string | null | undefined,
): string {
  const lp = matrixLocalpart(matrixUserId);
  const f = (firstName ?? "").trim();
  if (!f) return "";
  if (lp && f === lp) return "";
  if (isPhoneDerivedLocalpart(f)) return "";
  return f;
}
