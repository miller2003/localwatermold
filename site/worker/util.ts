export interface Env {
  ASSETS: { fetch(input: Request | string): Promise<Response> };
  OAUTH_SIGNING_KEY?: string;
}

// Same as /* in public/_headers, which only applies to static files, for responses the Worker makes.
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

// Agent endpoints are public and read-only, so any origin may call them from a browser.
export const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id, Link",
  "Access-Control-Max-Age": "86400",
};

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}, type = "application/json") =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { "Content-Type": `${type}; charset=utf-8`, ...SECURITY_HEADERS, ...headers } });

export const text = (body: string, type: string, headers: Record<string, string> = {}) =>
  new Response(body, { headers: { "Content-Type": `${type}; charset=utf-8`, ...SECURITY_HEADERS, ...headers } });

export const html = (body: string, status = 200) =>
  new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Frame-Options": "DENY", ...SECURITY_HEADERS } });

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Static JSON from the build (the agent API), read through the assets binding.
export async function asset<T>(env: Env, origin: string, path: string): Promise<T | null> {
  const res = await env.ASSETS.fetch(new Request(origin + path));
  return res.ok ? ((await res.json()) as T) : null;
}
