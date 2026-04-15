/** Resolves user.avatarUrl for <img> / Avatar. */
export function getAvatarSrc(
  url: string | null | undefined,
): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return undefined;
}
