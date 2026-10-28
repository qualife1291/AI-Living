import assert from "node:assert/strict";
import { verifyAccessJwtWithKeys, verifiedQaAccessRequest } from "../lib/cloudflare-access-jwt.ts";

const encoder = new TextEncoder();
const { privateKey, publicKey } = await crypto.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
  true, ["sign", "verify"],
);
const publicJwk = await crypto.subtle.exportKey("jwk", publicKey);
const key = { ...publicJwk, kid: "test-key", alg: "RS256", use: "sig" };
const keys = { keys: [key] };
const config = { audience: "qa-aud", teamDomain: "test.cloudflareaccess.com" };
const now = Math.floor(Date.now() / 1000);
const b64 = value => Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");
async function signed(payload, header = { alg: "RS256", kid: "test-key" }) {
  const signingInput = b64(header) + "." + b64(payload);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, encoder.encode(signingInput));
  return signingInput + "." + Buffer.from(sig).toString("base64url");
}
const payload = { iss: "https://test.cloudflareaccess.com", aud: "qa-aud", exp: now + 600, iat: now - 30, nbf: now - 30, sub: "QA" };
const good = await signed(payload);
assert.equal(await verifyAccessJwtWithKeys(good, config, keys, now), true);
assert.equal(await verifyAccessJwtWithKeys(await signed({ ...payload, aud: "other" }), config, keys, now), false);
assert.equal(await verifyAccessJwtWithKeys(await signed({ ...payload, iss: "https://evil.example" }), config, keys, now), false);
assert.equal(await verifyAccessJwtWithKeys(await signed({ ...payload, exp: now - 1 }), config, keys, now), false);
assert.equal(await verifyAccessJwtWithKeys(await signed({ ...payload, nbf: now + 600 }), config, keys, now), false);
assert.equal(await verifyAccessJwtWithKeys(await signed({ ...payload, iat: now + 600 }), config, keys, now), false);
assert.equal(await verifyAccessJwtWithKeys(good, { ...config, teamDomain: "evil.example" }, keys, now), false);
assert.equal(await verifyAccessJwtWithKeys(good, config, { keys: [] }, now), false);
assert.equal(await verifyAccessJwtWithKeys(good.slice(0, -4) + "abcd", config, keys, now), false);
assert.equal(await verifyAccessJwtWithKeys(await signed(payload, { alg: "HS256", kid: "test-key" }), config, keys, now), false);
assert.equal(await verifyAccessJwtWithKeys("invalid.payload.sig", config, keys, now), false);
const forged = new Request("https://ai-living-qa.example/api/living/pulse", { method: "POST", headers: { origin: "https://ai-living-qa.example", "cf-access-jwt-assertion": "forged" } });
assert.equal(await verifiedQaAccessRequest(forged, { ...config, hostname: "some-other.example" }), false);
assert.equal(await verifiedQaAccessRequest(new Request("https://ai-living-qa.example/api/living/pulse", { method: "POST" }), { ...config, hostname: "ai-living-qa.example" }), false);
// Regression: the actual QA authorizer must fetch JWKS using a
// Cloudflare-Workers-supported redirect mode and verify the signed JWT.
// A redirect is deliberately NOT followed; the verifier must fail closed.
const originalFetch = globalThis.fetch;
let jwksFetchCount = 0;
try {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://test.cloudflareaccess.com/cdn-cgi/access/certs");
    assert.equal(options?.redirect, "manual", "Workers does not support redirect:error");
    jwksFetchCount++;
    return new Response(JSON.stringify(keys), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const authorizedRequest = new Request("https://ai-living-qa.example/api/living/pulse", {
    method: "POST",
    headers: { "cf-access-jwt-assertion": good },
  });
  assert.equal(await verifiedQaAccessRequest(authorizedRequest, {
    ...config,
    hostname: "ai-living-qa.example",
  }), true, "valid Access assertion should authorize");
  assert.equal(jwksFetchCount, 1, "first authorized request should fetch JWKS once");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("PASS: signed QA Access JWT verified; forged, expired, wrong audience/issuer/kid/hostname rejected.");
