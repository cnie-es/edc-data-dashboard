/** Decodes a JWT payload object (middle segment). Returns undefined if not a valid JWT. */
export function decodeJwtPayload(token: string): Record<string, unknown> | undefined {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return undefined;
  }
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  try {
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

/** OIDC-style `family_name` from JWT payload when present. */
export function readJwtFamilyName(token: string | undefined): string | undefined {
  const trimmed = token?.trim();
  if (!trimmed) {
    return undefined;
  }
  const payload = decodeJwtPayload(trimmed);
  const raw = payload?.['family_name'];
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : undefined;
}

function djb2HexHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Derives a stable cache namespace (IndexedDB + in-memory) from a bearer token (JWT `sub` when present, else opaque hash).
 */
export function deriveCacheNamespaceFromBearerToken(token: string): string {
  const trimmed = token.trim();
  if (!trimmed) {
    return 'anonymous';
  }
  const payload = decodeJwtPayload(trimmed);
  const sub = payload?.['sub'];
  if (typeof sub === 'string' && sub.length > 0) {
    return `sub:${sub}`;
  }
  return `opaque:${djb2HexHash(trimmed)}`;
}
