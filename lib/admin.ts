/** Hosting must strip caller-supplied identity headers before injecting verified identity. */
export function adminAllowed(request: Request, config: { ownerId?: string; localAdmin?: string; privateOrigin?: string }) {
  const url = new URL(request.url);
  if (config.localAdmin === "true" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) return true;
  // Explicit opt-in only after native Sites verifies this origin is owner-private.
  // Dispatch authenticates browsers/service callers before invoking the Worker.
  if (config.privateOrigin && url.origin === config.privateOrigin) return true;
  return Boolean(config.ownerId && request.headers.get("oai-authenticated-user-id") === config.ownerId);
}

/**
 * Cloudflare QA only. Trust the Access runtime context supplied by Cloudflare
 * after its Worker-level Access policy has authenticated the request.
 * NEVER trust Origin, Cf-Access-Jwt-Assertion or email headers alone.
 * Other hosts (including Sites production) retain their existing auth path.
 */
export function cloudflareQaAccessAllowed(
  request: Request,
  access: { aud?: string } | undefined,
  config: { expectedAud?: string; hostname?: string },
): boolean {
  if (!config.expectedAud || !config.hostname || !access?.aud || access.aud !== config.expectedAud)
    return false;
  const url = new URL(request.url);
  return url.protocol === "https:" && url.hostname === config.hostname && url.port === "";
}
