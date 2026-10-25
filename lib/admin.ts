/** Hosting must strip caller-supplied identity headers before injecting verified identity. */
export function adminAllowed(request: Request, config: { ownerId?: string; localAdmin?: string }) {
  const url = new URL(request.url);
  if (config.localAdmin === "true" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) return true;
  return Boolean(config.ownerId && request.headers.get("oai-authenticated-user-id") === config.ownerId);
}
