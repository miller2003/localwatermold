// A minimal, stateless OAuth 2.1 authorization server for agents. Everything on the site is public, so
// a token unlocks nothing extra: this exists because some agent platforms and MCP clients expect to
// find one. Two ways in, both described in /auth.md:
//   - anonymous agent registration (auth.md): POST /agent/register -> identity_assertion,
//     then POST /oauth/token with the RFC 7523 jwt-bearer grant -> access_token
//   - standard MCP client flow: dynamic client registration (RFC 7591), authorization code + PKCE
// Nothing is stored. Client ids, codes, assertions and access tokens are all ES256 JWTs signed with the
// OAUTH_SIGNING_KEY secret (a private P-256 JWK, made by scripts/oauth-key.mjs). Without the secret,
// the endpoints answer 503 and the JWKS is empty; the rest of the site works the same.
import { type Env, json, cors, html, esc } from "./util";

export const SCOPE = "public.read";
const TOKEN_TTL = 3600;
const ASSERTION_TTL = 30 * 24 * 3600;
const CODE_TTL = 300;

const b64u = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const enc = new TextEncoder();
export const sha256 = async (s: string) => b64u(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s))));
export const sha256Hex = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");
const now = () => Math.floor(Date.now() / 1000);
const ALG = { name: "ECDSA", namedCurve: "P-256" };
const SIG = { name: "ECDSA", hash: "SHA-256" };

interface Keys { kid: string; priv: CryptoKey; pub: CryptoKey; jwk: JsonWebKey & { kid: string } }
let cached: { raw: string; keys: Keys } | undefined;
async function keys(env: Env): Promise<Keys | null> {
  const raw = env.OAUTH_SIGNING_KEY;
  if (!raw) return null;
  if (cached?.raw === raw) return cached.keys;
  const d = JSON.parse(raw) as JsonWebKey & { kid: string };
  const { d: _secret, key_ops: _ops, ...pubJwk } = d;
  const jwk = { ...pubJwk, kid: d.kid, use: "sig", alg: "ES256" };
  const k: Keys = {
    kid: d.kid,
    priv: await crypto.subtle.importKey("jwk", { ...d, key_ops: ["sign"] }, ALG, false, ["sign"]),
    pub: await crypto.subtle.importKey("jwk", { ...pubJwk, key_ops: ["verify"] }, ALG, false, ["verify"]),
    jwk,
  };
  cached = { raw, keys: k };
  return k;
}

export async function jwks(env: Env) {
  const k = await keys(env);
  return json({ keys: k ? [k.jwk] : [] }, 200, { "Cache-Control": "public, max-age=3600", ...cors });
}

type Claims = Record<string, unknown> & { typ: string; exp?: number };
async function sign(k: Keys, claims: Claims) {
  const head = b64u(enc.encode(JSON.stringify({ alg: "ES256", typ: claims.typ === "at" ? "at+jwt" : "JWT", kid: k.kid })));
  const body = b64u(enc.encode(JSON.stringify({ iat: now(), ...claims })));
  const sig = new Uint8Array(await crypto.subtle.sign(SIG, k.priv, enc.encode(`${head}.${body}`)));
  return `${head}.${body}.${b64u(sig)}`;
}
async function verify(k: Keys, token: string, typ: string, iss: string): Promise<Claims | null> {
  const [head, body, sig] = token.split(".");
  if (!head || !body || !sig) return null;
  try {
    if (!(await crypto.subtle.verify(SIG, k.pub, unb64u(sig), enc.encode(`${head}.${body}`)))) return null;
    const c = JSON.parse(new TextDecoder().decode(unb64u(body))) as Claims;
    if (c.typ !== typ || c.iss !== iss || (c.exp && c.exp < now())) return null;
    return c;
  } catch {
    return null;
  }
}

const oauthError = (error: string, description: string, status = 400) =>
  json({ error, error_description: description }, status, { "Cache-Control": "no-store", ...cors });
const unavailable = () => oauthError("temporarily_unavailable", "The authorization server isn't configured yet.", 503);

async function accessToken(k: Keys, origin: string, sub: string, resource?: string) {
  const access_token = await sign(k, { typ: "at", iss: origin, sub, aud: resource || origin, scope: SCOPE, jti: crypto.randomUUID(), exp: now() + TOKEN_TTL });
  return json({ access_token, token_type: "Bearer", expires_in: TOKEN_TTL, scope: SCOPE }, 200, { "Cache-Control": "no-store", ...cors });
}

// Returns null when the request may go ahead (no token, or a valid one), or the 401 to send back.
export async function checkBearer(request: Request, env: Env, prm: string): Promise<Response | null> {
  const auth = request.headers.get("Authorization");
  if (!auth) return null;
  const token = auth.match(/^Bearer\s+(\S+)$/i)?.[1];
  const k = await keys(env);
  const origin = new URL(request.url).origin;
  if (token && k && (await verify(k, token, "at", origin))) return null;
  return json({ error: "invalid_token", error_description: "The access token is invalid or expired. Requests without a token are also accepted." }, 401, {
    "WWW-Authenticate": `Bearer error="invalid_token", resource_metadata="${prm}"`,
    ...cors,
  });
}

// RFC 7591 redirect URIs: https anywhere, http only on loopback, or an app's private-use scheme.
function okRedirect(uri: unknown): uri is string {
  if (typeof uri !== "string" || uri.length > 2000) return false;
  try {
    const u = new URL(uri);
    if (u.hash) return false;
    if (u.protocol === "https:") return true;
    if (u.protocol === "http:") return ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
    return /^[a-z][a-z0-9+.-]*\.[a-z0-9+.-]+:$/i.test(u.protocol); // e.g. com.example.app:
  } catch {
    return false;
  }
}

async function register(request: Request, env: Env, origin: string) {
  const k = await keys(env);
  if (!k) return unavailable();
  const body = (await request.json().catch(() => null)) as { redirect_uris?: unknown; client_name?: unknown } | null;
  const uris = body?.redirect_uris;
  if (!Array.isArray(uris) || !uris.length || uris.length > 10 || !uris.every(okRedirect)) {
    return oauthError("invalid_redirect_uri", "redirect_uris must list 1 to 10 https, loopback http, or private-use scheme URIs.");
  }
  const client_name = typeof body?.client_name === "string" ? body.client_name.slice(0, 100) : undefined;
  const client_id = await sign(k, { typ: "client", iss: origin, redirect_uris: uris, ...(client_name ? { client_name } : {}) });
  return json({
    client_id, client_id_issued_at: now(), redirect_uris: uris, ...(client_name ? { client_name } : {}),
    grant_types: ["authorization_code"], response_types: ["code"], token_endpoint_auth_method: "none", scope: SCOPE,
  }, 201, { "Cache-Control": "no-store", ...cors });
}

// Authorization request: validates the client and redirect URI, then shows a consent page (GET) or
// issues the code (POST from that page). Errors before the redirect URI is trusted are shown, never
// redirected, so this can't be used as an open redirect.
async function authorize(request: Request, env: Env, origin: string) {
  const k = await keys(env);
  if (!k) return unavailable();
  const q = request.method === "POST" ? new URLSearchParams(await request.text()) : new URL(request.url).searchParams;
  const client = await verify(k, q.get("client_id") || "", "client", origin);
  const uris = (client?.redirect_uris as string[]) || [];
  const redirect = q.get("redirect_uri") || (uris.length === 1 ? uris[0] : "");
  if (!client || !uris.includes(redirect)) {
    return html(page("Can't continue", "<p>This sign-in link has an unknown app or return address. Go back to the app and try connecting again.</p>"), 400);
  }
  const back = (params: Record<string, string>) => {
    const u = new URL(redirect);
    for (const [key, v] of Object.entries(params)) u.searchParams.set(key, v);
    if (q.get("state")) u.searchParams.set("state", q.get("state")!);
    u.searchParams.set("iss", origin);
    return new Response(null, { status: 302, headers: { Location: u.href, "Cache-Control": "no-store" } });
  };
  if (q.get("response_type") !== "code") return back({ error: "unsupported_response_type" });
  if (!q.get("code_challenge") || q.get("code_challenge_method") !== "S256") return back({ error: "invalid_request", error_description: "PKCE with S256 is required." });
  if (request.method === "POST") {
    if (q.get("decision") !== "allow") return back({ error: "access_denied" });
    const code = await sign(k, {
      typ: "code", iss: origin, cid: await sha256(q.get("client_id")!), redirect_uri: redirect,
      challenge: q.get("code_challenge"), resource: q.get("resource") || undefined, sub: `anon:${crypto.randomUUID()}`, exp: now() + CODE_TTL,
    });
    return back({ code });
  }
  const app = typeof client.client_name === "string" ? client.client_name : "An app";
  const hidden = ["client_id", "redirect_uri", "response_type", "code_challenge", "code_challenge_method", "state", "scope", "resource"]
    .filter((n) => q.get(n) || n === "redirect_uri")
    .map((n) => `<input type="hidden" name="${n}" value="${esc(n === "redirect_uri" ? redirect : q.get(n)!)}">`).join("");
  return html(page("Connect to Local Water & Mold", `
    <p><strong>${esc(app)}</strong> wants read-only access to Local Water &amp; Mold's public guides and county data.</p>
    <p>There are no accounts here, so this doesn't share anything about you. It gives the app nothing that isn't already public on the site.</p>
    <p class="small">You'll return to <strong>${esc(new URL(redirect).host || redirect)}</strong>.</p>
    <form method="post" action="/oauth/authorize">${hidden}
      <button name="decision" value="allow">Allow</button>
      <button name="decision" value="deny" class="ghost">Cancel</button>
    </form>`));
}

async function token(request: Request, env: Env, origin: string) {
  const k = await keys(env);
  if (!k) return unavailable();
  const f = new URLSearchParams(await request.text());
  const grant = f.get("grant_type");
  if (grant === "authorization_code") {
    const code = await verify(k, f.get("code") || "", "code", origin);
    if (!code) return oauthError("invalid_grant", "The code is invalid or expired.");
    if (code.redirect_uri !== f.get("redirect_uri") || code.cid !== (await sha256(f.get("client_id") || ""))) {
      return oauthError("invalid_grant", "client_id or redirect_uri doesn't match the authorization request.");
    }
    if (!f.get("code_verifier") || (await sha256(f.get("code_verifier")!)) !== code.challenge) return oauthError("invalid_grant", "PKCE verification failed.");
    return accessToken(k, origin, code.sub as string, f.get("resource") || (code.resource as string | undefined));
  }
  if (grant === "urn:ietf:params:oauth:grant-type:jwt-bearer") {
    const assertion = await verify(k, f.get("assertion") || "", "identity", origin);
    if (!assertion) return oauthError("invalid_grant", "The identity_assertion is invalid or expired. Register again at /agent/register.");
    return accessToken(k, origin, assertion.sub as string, f.get("resource") || undefined);
  }
  return oauthError("unsupported_grant_type", "Use authorization_code or urn:ietf:params:oauth:grant-type:jwt-bearer.");
}

// auth.md agent registration. Only anonymous registration exists: there are no user accounts.
async function agentRegister(request: Request, env: Env, origin: string) {
  const k = await keys(env);
  if (!k) return unavailable();
  const body = (await request.json().catch(() => ({}))) as { type?: string };
  if (body.type && body.type !== "anonymous") {
    return json({ error: `${body.type}_not_enabled`, error_description: "Only anonymous registration is supported. Send {\"type\":\"anonymous\"}." }, 400, cors);
  }
  const id = crypto.randomUUID();
  const exp = now() + ASSERTION_TTL;
  const identity_assertion = await sign(k, { typ: "identity", iss: origin, sub: `anon:${id}`, aud: origin, scope: SCOPE, exp });
  return json({
    registration_id: `reg_${id}`,
    registration_type: "anonymous",
    identity_assertion,
    assertion_expires: new Date(exp * 1000).toISOString(),
    pre_claim_scopes: [SCOPE],
    post_claim_scopes: [SCOPE],
    token_endpoint: `${origin}/oauth/token`,
  }, 200, { "Cache-Control": "no-store", ...cors });
}

// There's no account to claim an anonymous registration into, so the claim ceremony never applies.
const agentClaim = () => json({
  error: "claim_not_supported",
  error_description: "Registrations here are anonymous and read-only, and there are no user accounts to claim them into. Keep using the anonymous identity_assertion.",
}, 400, cors);

export async function handleOAuth(request: Request, env: Env, path: string): Promise<Response | null> {
  const origin = new URL(request.url).origin;
  const post = request.method === "POST";
  if (path === "/oauth/authorize" && (post || request.method === "GET")) return authorize(request, env, origin);
  if (path === "/oauth/token" && post) return token(request, env, origin);
  if (path === "/oauth/register" && post) return register(request, env, origin);
  if (path === "/agent/register" && post) return agentRegister(request, env, origin);
  if (path === "/agent/claim" && post) return agentClaim();
  if (["/oauth/token", "/oauth/register", "/agent/register", "/agent/claim"].includes(path)) {
    return json({ error: "invalid_request", error_description: "Use POST." }, 405, { Allow: "POST", ...cors });
  }
  return null;
}

const page = (title: string, body: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>:root{color-scheme:light dark;--bg:#fbf8f3;--ink:#1d2329;--line:#d9d2c5;--btn:#b3261e}@media (prefers-color-scheme:dark){:root{--bg:#0e151c;--ink:#e8e4dc;--line:#33404c;--btn:#e5534b}}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.55 system-ui,sans-serif}main{max-width:32rem;margin:12vh auto;padding:0 16px}h1{font-size:1.5rem}.small{font-size:.9rem;opacity:.8}
button{font:inherit;font-weight:600;padding:10px 18px;border-radius:8px;border:1px solid var(--btn);background:var(--btn);color:#fff;cursor:pointer;margin-right:8px}button.ghost{background:transparent;color:var(--ink);border-color:var(--line)}</style>
</head><body><main><h1>${esc(title)}</h1>${body}</main></body></html>`;
