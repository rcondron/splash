/** Client-readable cookie mirroring the JWT for API fallback and future middleware. */
export const AUTH_COOKIE_NAME = "splash-auth-token";

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

function cookieFlags(): string {
  if (typeof window === "undefined") return "";
  const secure =
    window.location.protocol === "https:" ? "; Secure" : "";
  return `; path=/; max-age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax${secure}`;
}

export function setAuthCookie(token: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}${cookieFlags()}`;
}

export function clearAuthCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0`;
}

export function getAuthCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${AUTH_COOKIE_NAME}=([^;]*)`),
  );
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}
