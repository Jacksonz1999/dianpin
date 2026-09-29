/**
 * Only ever allow same-origin relative redirects after login. A bare
 * `/foo` is fine; `//evil.com` (protocol-relative) or `https://evil.com`
 * is not — those are classic open-redirect payloads, and `next` ultimately
 * comes from a URL query param a user could hand-craft.
 */
export function sanitizeNextPath(path: string | null | undefined): string | null {
  if (!path) return null;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  return path;
}
