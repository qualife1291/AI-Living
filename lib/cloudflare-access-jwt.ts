/**
 * Cloudflare Access JWT verifier for QA Workers with Static Assets.
 * The internal Static Assets router does NOT forward ctx.access to app Workers.
 * Use the cryptographically verified Access assertion as a fallback, never a
 * client-controlled Origin or an unsigned claim. Fail closed on all errors.
 */
type AccessKey = JsonWebKey & { kid?: string; alg?: string; use?: string };
export type AccessJwks = { keys: AccessKey[] };
export type QaJwtConfig = { audience: string; teamDomain: string };

const MAX_JWT_BYTES = 16_384;
const JWKS_TTL_MS = 5 * 60 * 1000;
let cached: { url: string; until: number; keys: AccessJwks } | undefined;

function decodeBase64url(value: string): Uint8Array {
  if (!value || value.length > MAX_JWT_BYTES || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("invalid jwt segment");
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function decodeJson(value: string): Record<string, unknown> {
  const obj: unknown = JSON.parse(new TextDecoder().decode(decodeBase64url(value)));
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw new Error("invalid jwt json");
  return obj as Record<string, unknown>;
}

export async function verifyAccessJwtWithKeys(
  token: string,
  config: QaJwtConfig,
  jwks: AccessJwks,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  try {
    if (!config.audience || !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(config.teamDomain)) return false;
    if (!token || token.length > MAX_JWT_BYTES) return false;
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const header = decodeJson(parts[0]), claims = decodeJson(parts[1]);
    if (header.alg !== "RS256" || typeof header.kid !== "string" || !header.kid) return false;
    if (claims.iss !== `https://${config.teamDomain}`) return false;
    const aud = claims.aud;
    if (!(aud === config.audience || (Array.isArray(aud) && aud.includes(config.audience)))) return false;
    if (typeof claims.exp !== "number" || !Number.isFinite(claims.exp) || claims.exp <= nowSeconds) return false;
    if (claims.nbf !== undefined && (typeof claims.nbf !== "number" || claims.nbf > nowSeconds + 30)) return false;
    if (claims.iat !== undefined && (typeof claims.iat !== "number" || claims.iat > nowSeconds + 30)) return false;
    const key = jwks.keys.find(k =>
      k.kid === header.kid && k.kty === "RSA" &&
      (!k.alg || k.alg === "RS256") && (!k.use || k.use === "sig"));
    if (!key) return false;
    const publicKey = await crypto.subtle.importKey(
      "jwk", key, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"],
    );
    const signature = decodeBase64url(parts[2]);
    return crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5", publicKey, signature,
      new TextEncoder().encode(parts[0] + "." + parts[1]),
    );
  } catch {
    return false;
  }
}

async function loadAccessJwks(domain: string, refresh = false): Promise<AccessJwks> {
  const url = `https://${domain}/cdn-cgi/access/certs`;
  if (!refresh && cached && cached.url === url && cached.until > Date.now()) return cached.keys;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("Cloudflare Access public certificates unavailable");
  const body: unknown = await response.json();
  const jwks = body as AccessJwks;
  if (!Array.isArray(jwks?.keys) || jwks.keys.length === 0 || jwks.keys.length > 30)
    throw new Error("Invalid Cloudflare Access JWKS response");
  cached = { url, keys: jwks, until: Date.now() + JWKS_TTL_MS };
  return jwks;
}

/** Only invoked for QA Worker requests after the Access edge policy. */
export async function verifiedQaAccessRequest(
  request: Request,
  config: QaJwtConfig & { hostname: string },
): Promise<boolean> {
  if (request.method === "OPTIONS") return false;
  const url = new URL(request.url);
  if (url.protocol !== "https:" || url.hostname !== config.hostname || url.port) return false;
  if (!config.audience || !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(config.teamDomain)) return false;
  // Cloudflare Access can forward the signed assertion header or issue the
  // same JWT as a CF_Authorization cookie. Either is UNTRUSTED until signature
  // verification against the team's JWKS succeeds.
  const fromHeader = request.headers.get("cf-access-jwt-assertion");
  const cookie = request.headers.get("cookie") ?? "";
  const cookieMatch = /(?:^|;\\s*)CF_Authorization=([^;]+)/.exec(cookie);
  const assertion = fromHeader || cookieMatch?.[1];
  if (!assertion) {
    console.warn("qa_jwt_diagnostic", { reason: "signed_assertion_missing" });
    return false;
  }
  try {
    const keys = await loadAccessJwks(config.teamDomain);
    if (await verifyAccessJwtWithKeys(assertion, config, keys)) return true;
    // Log booleans only. Never log claims, JWTs, cookies or identities.
    const parts = assertion.split(".");
    let diagnostic = { reason: "signature_or_claims_invalid", jwksLoaded: true, keyMatch: false,
      audienceMatch: false, issuerMatch: false, expiryValid: false, algorithmRS256: false };
    try {
      const header = decodeJson(parts[0]), claims = decodeJson(parts[1]);
      const aud = claims.aud;
      diagnostic = {
        reason: "signature_or_claims_invalid",
        jwksLoaded: true,
        keyMatch: keys.keys.some(k => k.kid === header.kid),
        audienceMatch: aud === config.audience || (Array.isArray(aud) && aud.includes(config.audience)),
        issuerMatch: claims.iss === `https://${config.teamDomain}`,
        expiryValid: typeof claims.exp === "number" && claims.exp > Math.floor(Date.now() / 1000),
        algorithmRS256: header.alg === "RS256",
      };
    } catch { /* Never disclose malformed token fields. */ }
    // Handles public-key rotations within the cache lifetime.
    if (await verifyAccessJwtWithKeys(assertion, config, await loadAccessJwks(config.teamDomain, true))) return true;
    console.warn("qa_jwt_diagnostic", diagnostic);
    return false;
  } catch (e) {
    console.warn("qa_jwt_diagnostic", {
      reason: "jwks_unavailable",
      errorType: e instanceof Error ? e.name : "unknown",
    });
    return false;
  }
}
