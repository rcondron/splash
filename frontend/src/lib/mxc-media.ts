/**
 * Turn an MXC avatar URL into a browser-loadable path (Synapse media API).
 * Relies on Next.js rewriting `/_matrix/*` to the homeserver.
 */
export function mxcToMediaPath(mxc: string | null | undefined): string | null {
  if (!mxc?.startsWith("mxc://")) return null;
  const rest = mxc.slice(6);
  const slash = rest.indexOf("/");
  if (slash === -1) return null;
  const server = rest.slice(0, slash);
  const mediaId = rest.slice(slash + 1);
  if (!server || !mediaId) return null;
  return `/_matrix/media/v3/download/${encodeURIComponent(server)}/${encodeURIComponent(mediaId)}`;
}
