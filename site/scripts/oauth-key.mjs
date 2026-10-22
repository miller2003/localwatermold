// Usage: node scripts/oauth-key.mjs | npx wrangler secret put OAUTH_SIGNING_KEY
// Prints a new private P-256 JWK for the Worker's OAuth server (worker/oauth.ts) to sign tokens with.
// Rotating it signs everyone out, which only means agents register again. For `npm run preview`, put
// the same line in .dev.vars as OAUTH_SIGNING_KEY='<jwk>' (.dev.vars is git-ignored).
import { webcrypto as crypto } from "node:crypto";

const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
process.stdout.write(JSON.stringify({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d, kid: new Date().toISOString().slice(0, 10) }));
