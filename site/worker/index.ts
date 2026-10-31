// The Worker in front of the static site (wrangler.jsonc: run_worker_first for everything but /_astro/).
// Static files still come from the assets binding, with public/_headers and _redirects applied. On top:
//   - Markdown for agents: "Accept: text/markdown" gets the page's index.md (scripts/markdown.mjs)
//   - Link headers (RFC 8288) on HTML pages pointing agents at the discovery documents
//   - the MCP server, OAuth endpoints and discovery documents (mcp.ts, oauth.ts, discovery.ts)
//   - /api/postback: network conversion / call callbacks to PostHog (postback.js, needs POSTBACK_SECRET)
import { type Env, cors, json } from "./util";
// @ts-ignore plain JS module shared with the other sites
import { handlePostback } from "./postback.js";
import { handleMcp } from "./mcp";
import { handleOAuth, checkBearer } from "./oauth";
import { handleDiscovery, LINK_HEADER } from "./discovery";

// q-value of a media type in an Accept header (0 when absent).
function q(accept: string, type: string) {
  let best = 0;
  for (const part of accept.split(",")) {
    const [t, ...params] = part.trim().toLowerCase().split(";");
    if (t.trim() !== type) continue;
    const qp = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
    best = Math.max(best, qp ? Number(qp.slice(2)) || 0 : 1);
  }
  return best;
}
const wantsMarkdown = (request: Request) => {
  const accept = request.headers.get("Accept") || "";
  const md = q(accept, "text/markdown");
  return md > 0 && md >= q(accept, "text/html");
};

async function markdown(md: Response, canonical: string, head: boolean) {
  const body = await md.text();
  return new Response(head ? null : body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      // Rough token count (about 4 characters per token), as Cloudflare's Markdown for Agents sends.
      "x-markdown-tokens": String(Math.ceil(body.length / 4)),
      "Vary": "Accept",
      "Link": `<${canonical}>; rel="canonical"`,
      "X-Robots-Tag": "noindex",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      ...cors,
    },
  });
}

async function staticPage(request: Request, env: Env, url: URL) {
  const read = request.method === "GET" || request.method === "HEAD";
  const dir = url.pathname.endsWith("/");
  if (read && dir && wantsMarkdown(request)) {
    const md = await env.ASSETS.fetch(new Request(new URL(`${url.pathname}index.md`, url)));
    if (md.ok) return markdown(md, url.origin + url.pathname, request.method === "HEAD");
  }
  if (read && url.pathname.endsWith("/index.md")) {
    const md = await env.ASSETS.fetch(request);
    if (md.ok) return markdown(md, url.origin + url.pathname.replace(/index\.md$/, ""), request.method === "HEAD");
    return md;
  }
  const res = await env.ASSETS.fetch(request);
  if (!(res.headers.get("Content-Type") || "").startsWith("text/html")) return res;
  const out = new Response(res.body, res);
  out.headers.append("Vary", "Accept");
  out.headers.set("Link", dir && res.ok
    ? `${LINK_HEADER}, <${url.pathname}index.md>; rel="alternate"; type="text/markdown"`
    : LINK_HEADER);
  return out;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const agentPath = path === "/mcp" || path === "/auth.md" || /^\/(\.well-known|api|oauth|agent)\//.test(path);
    if (request.method === "OPTIONS" && agentPath) return new Response(null, { status: 204, headers: cors });

    // Network S2S callbacks (pay-per-call / affiliate): own shared secret, so before the API bearer check.
    if (path === "/api/postback" || path === "/api/postback/") return handlePostback(request, env, "localwatermold.com");

    // One host for search: www served 200s with an apex canonical, so Google indexed both.
    if (url.hostname.startsWith("www.") && (request.method === "GET" || request.method === "HEAD")) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }

    if (path === "/mcp") {
      return (await checkBearer(request, env, `${url.origin}/.well-known/oauth-protected-resource/mcp`)) ?? handleMcp(request, env);
    }
    if (path.startsWith("/api/")) {
      const denied = await checkBearer(request, env, `${url.origin}/.well-known/oauth-protected-resource`);
      if (denied) return denied;
    }
    const doc = await handleDiscovery(request, env, path);
    if (doc) return doc;
    const auth = await handleOAuth(request, env, path);
    if (auth) return auth;
    if (path.startsWith("/api/")) {
      const res = await env.ASSETS.fetch(request);
      const out = new Response(res.body, res);
      for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
      if (res.status === 404) return json({ error: "not_found", docs: `${url.origin}/api/v1/openapi.json` }, 404, cors);
      return out;
    }
    return staticPage(request, env, url);
  },
};
