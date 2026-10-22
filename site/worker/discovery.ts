// Agent discovery documents, built per request from the request's origin so preview URLs describe
// themselves: RFC 9727 API catalog, MCP server card, ARD catalog, agent skills index and SKILL.md,
// OAuth metadata (RFC 8414, RFC 9728), auth.md, and the WebMCP script. /developers/ documents them.
import { type Env, json, text, cors } from "./util";
import { TOOLS, SERVER_INFO, INSTRUCTIONS } from "./mcp";
import { SCOPE, jwks, sha256Hex } from "./oauth";

const BRAND = "Local Water & Mold";
const SKILL = "find-water-damage-help";

export const LINK_HEADER = [
  `</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"`,
  `</api/v1/openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"`,
  `</developers/>; rel="service-doc"; type="text/html"`,
  `</.well-known/mcp/server-card.json>; rel="describedby"; type="application/json"`,
  `</.well-known/agent-skills/index.json>; rel="describedby"; type="application/json"`,
  `</.well-known/ai-catalog.json>; rel="ai-catalog"; type="application/json"`,
  `</llms.txt>; rel="describedby"; type="text/plain"`,
].join(", ");

const apiCatalog = (o: string) => ({
  linkset: [
    {
      anchor: `${o}/api/v1/`,
      "service-desc": [{ href: `${o}/api/v1/openapi.json`, type: "application/vnd.oai.openapi+json" }],
      "service-doc": [{ href: `${o}/developers/`, type: "text/html" }],
      status: [{ href: `${o}/api/v1/health`, type: "application/json" }],
    },
    {
      anchor: `${o}/mcp`,
      "service-desc": [{ href: `${o}/.well-known/mcp/server-card.json`, type: "application/json" }],
      "service-doc": [{ href: `${o}/developers/#mcp`, type: "text/html" }],
      status: [{ href: `${o}/api/v1/health`, type: "application/json" }],
    },
  ],
});

const serverCard = (o: string) => ({
  serverInfo: SERVER_INFO,
  description: `Read-only tools for ${BRAND}: find a county's water damage and mold guidance page and local risk figures, get the local restoration referral line, search the guides, and read any page as Markdown.`,
  instructions: INSTRUCTIONS,
  url: `${o}/mcp`,
  transport: { type: "streamable-http", endpoint: `${o}/mcp` },
  protocolVersion: "2025-06-18",
  capabilities: { tools: { listChanged: false }, resources: null, prompts: null },
  authentication: { required: false, schemes: ["oauth2"], protectedResourceMetadata: `${o}/.well-known/oauth-protected-resource/mcp` },
  tools: TOOLS.map(({ name, title, description, inputSchema }) => ({ name, title, description, inputSchema })),
  documentationUrl: `${o}/developers/#mcp`,
  contact: { email: "hello@localwatermold.com" },
});

const aiCatalog = (o: string, host: string) => ({
  specVersion: "1.0",
  host: { displayName: BRAND, identifier: `did:web:${host}`, url: `${o}/`, documentationUrl: `${o}/developers/` },
  entries: [
    {
      identifier: `urn:air:${host}:mcp:water-damage-help`,
      displayName: `${BRAND} MCP server`,
      description: "Find county water damage and mold guidance, local risk figures and the restoration referral line; search and read the guides.",
      type: "application/mcp-server-card+json",
      url: `${o}/.well-known/mcp/server-card.json`,
      representativeQueries: [
        "my basement flooded in Wayne County Ohio, what should I do",
        "who can I call for water damage restoration near me",
        "how many nights below 20°F does Cook County Illinois get",
        "does homeowners insurance cover a burst pipe",
      ],
    },
    {
      identifier: `urn:air:${host}:api:county-guidance`,
      displayName: `${BRAND} county data API`,
      description: "Read-only JSON: states covered, every county page with housing-age and weather-risk figures, and the guides.",
      type: "application/vnd.oai.openapi+json",
      url: `${o}/api/v1/openapi.json`,
      representativeQueries: [
        "list counties in Pennsylvania with water damage guides",
        "share of homes built before 1980 by county",
        "heavy rain days per year for a U.S. county",
      ],
    },
    {
      identifier: `urn:air:${host}:skill:${SKILL}`,
      displayName: "Help a homeowner with water damage or mold",
      description: "Agent skill: safety first, then the county page, the referral line and the right guide.",
      type: "text/markdown",
      url: `${o}/.well-known/agent-skills/${SKILL}/SKILL.md`,
      representativeQueries: [
        "water is coming through my ceiling, what do I do first",
        "I found black mold after a leak",
        "how do I file a water damage insurance claim in Texas",
      ],
    },
    {
      identifier: `urn:air:${host}:docs:llms-txt`,
      displayName: `${BRAND} llms.txt`,
      description: "Site summary and key facts for AI assistants, with links to every guide and state.",
      type: "text/plain",
      url: `${o}/llms.txt`,
      representativeQueries: [
        "how long until mold grows after water damage",
        "what is category 3 black water",
      ],
    },
  ],
});

const skillMd = (o: string) => `---
name: ${SKILL}
description: Help a U.S. homeowner with water damage, mold, fire or smoke damage, or a flooded basement using Local Water & Mold. Use when someone describes a leak, flood, burst pipe, sewer backup, mold, or asks who to call for restoration or what insurance covers.
---

# Help a homeowner with water damage or mold

${BRAND} (${o}) publishes free county-level guidance for U.S. homeowners and runs a referral line that connects callers with participating local restoration companies. It doesn't do restoration work itself.

## Steps

1. **Safety first.** If anyone is in danger, there's a gas smell, or water is near outlets or the electrical panel, tell them to leave the building and call 911. Say this before anything else.
2. **Stop the water.** Fixture shutoff valve, or the main water shutoff. Photograph everything before cleanup. Don't use bleach as a routine mold treatment.
3. **Find their county.** Call the MCP tool \`find_county\` with the state and county (map a city to its county first), or read \`${o}/api/v1/states/{state-slug}.json\`. Link the county page: it has local first steps, housing age and freeze, rain and humidity figures.
4. **Who to call.** \`get_help_line\` gives the referral number for that area, or says the line isn't live yet. Calls are free and there's no obligation to hire. Never invent a phone number.
5. **The right guide.** \`search_guides\` with a topic (insurance, black mold, water heater, frozen pipes, drying time, cost) and the state. Use \`get_page\` to read a guide as Markdown before answering, and cite its URL.

## Endpoints

- MCP (Streamable HTTP, no auth needed): ${o}/mcp
- JSON API: ${o}/api/v1/openapi.json
- Any page as Markdown: request it with \`Accept: text/markdown\`
- Summary for AI assistants: ${o}/llms.txt

## Don'ts

- Don't present ${BRAND} as a contractor, or as affiliated with any insurer or restoration franchise.
- Don't give legal or insurance-coverage guarantees. Point to the state insurance regulator listed in the state record.
`;

const authMd = (o: string) => `# ${BRAND} auth.md

You are an agent. You don't need to authenticate to use ${BRAND}. Every page, the JSON API (${o}/api/v1/) and the MCP server (${o}/mcp) are public and read-only, and requests without credentials are always accepted.

Some agent platforms require OAuth before they'll call a server, so this site runs a small OAuth 2.1 authorization server. A token grants the single scope \`${SCOPE}\`, which is the same access everyone already has. There are no user accounts, and registering shares nothing about you or your user.

## Discover

- Protected resource metadata (RFC 9728): ${o}/.well-known/oauth-protected-resource (for the MCP server: ${o}/.well-known/oauth-protected-resource/mcp)
- Authorization server metadata (RFC 8414): ${o}/.well-known/oauth-authorization-server, with an \`agent_auth\` block
- Signing keys: ${o}/.well-known/jwks.json

## Register (anonymous)

Only anonymous registration is supported. There's no user identity to assert and nothing to claim.

\`\`\`http
POST ${o}/agent/register
Content-Type: application/json

{ "type": "anonymous" }
\`\`\`

The response has an \`identity_assertion\` (a JWT, valid for 30 days) and its scopes.

## Exchange it for an access token

\`\`\`http
POST ${o}/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=<identity_assertion>
\`\`\`

You get \`{ "access_token", "token_type": "Bearer", "expires_in": 3600, "scope": "${SCOPE}" }\`. Repeat this step when it expires; register again when the assertion expires or the token endpoint returns \`invalid_grant\`.

## Use it

Send \`Authorization: Bearer <access_token>\` to ${o}/mcp or ${o}/api/v1/. An invalid or expired token gets a 401 with a \`WWW-Authenticate\` header pointing to the resource metadata. Leaving the header off always works.

## MCP clients

Standard MCP clients can use dynamic client registration (${o}/oauth/register) and the authorization code flow with PKCE (S256) at ${o}/oauth/authorize. The consent page asks a person to allow read-only access; there's no sign-in.

## Claim and revocation

The claim ceremony doesn't apply: there are no accounts to claim an anonymous registration into, so ${o}/agent/claim always answers \`claim_not_supported\`. Tokens can't be revoked individually; access tokens expire after an hour.

Questions: hello@localwatermold.com. Developer guide: ${o}/developers/
`;

const protectedResource = (o: string, resource: string) => ({
  resource,
  resource_name: BRAND,
  resource_logo_uri: `${o}/logo.png`,
  authorization_servers: [o],
  scopes_supported: [SCOPE],
  bearer_methods_supported: ["header"],
  resource_documentation: `${o}/developers/`,
  resource_policy_uri: `${o}/privacy/`,
  resource_tos_uri: `${o}/terms/`,
});

const authServer = (o: string) => ({
  issuer: o,
  authorization_endpoint: `${o}/oauth/authorize`,
  token_endpoint: `${o}/oauth/token`,
  registration_endpoint: `${o}/oauth/register`,
  jwks_uri: `${o}/.well-known/jwks.json`,
  scopes_supported: [SCOPE],
  response_types_supported: ["code"],
  response_modes_supported: ["query"],
  grant_types_supported: ["authorization_code", "urn:ietf:params:oauth:grant-type:jwt-bearer"],
  token_endpoint_auth_methods_supported: ["none"],
  code_challenge_methods_supported: ["S256"],
  authorization_response_iss_parameter_supported: true,
  service_documentation: `${o}/auth.md`,
  op_policy_uri: `${o}/privacy/`,
  op_tos_uri: `${o}/terms/`,
  // Restates the protected resource metadata, as auth.md does.
  resource: o,
  authorization_servers: [o],
  bearer_methods_supported: ["header"],
  agent_auth: {
    skill: `${o}/auth.md`,
    register_uri: `${o}/agent/register`,
    claim_uri: `${o}/agent/claim`,
    identity_types_supported: ["anonymous"],
    anonymous: {
      credential_types_supported: ["urn:ietf:params:oauth:token-type:jwt"],
      scopes: [SCOPE],
    },
    token_endpoint: `${o}/oauth/token`,
    grant_types_supported: ["urn:ietf:params:oauth:grant-type:jwt-bearer"],
  },
});

// In-page WebMCP tools (webmachinelearning.github.io/webmcp): the MCP server's tools, run through
// /mcp, plus open_page to navigate. Loaded with defer from src/layouts/Base.astro.
const webmcpJs = () => `(function () {
  var mc = document.modelContext || navigator.modelContext;
  if (!mc || typeof mc.registerTool !== "function") return;
  var tools = ${JSON.stringify(TOOLS.map(({ name, title, description, inputSchema, annotations }) => ({ name, title, description, inputSchema, annotations })))};
  var n = 0;
  function call(name, args) {
    return fetch("/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++n, method: "tools/call", params: { name: name, arguments: args || {} } })
    }).then(function (r) { return r.json(); }).then(function (m) {
      if (m.error) throw new Error(m.error.message);
      return m.result;
    });
  }
  tools.push({
    name: "open_page",
    title: "Open a page",
    description: "Navigate this tab to a page on localwatermold.com, e.g. a county page or guide URL from the other tools.",
    inputSchema: { type: "object", properties: { url: { type: "string", description: "A localwatermold.com URL or path" } }, required: ["url"] },
    annotations: { readOnlyHint: false }
  });
  var controller = new AbortController();
  tools.forEach(function (t) {
    var tool = {
      name: t.name, title: t.title, description: t.description, inputSchema: t.inputSchema, annotations: t.annotations,
      execute: function (args) {
        if (t.name !== "open_page") return call(t.name, args);
        var u = new URL(String((args && args.url) || "/"), location.origin);
        if (u.origin !== location.origin) throw new Error("Only pages on this site can be opened.");
        location.assign(u.href);
        return { content: [{ type: "text", text: "Opening " + u.href }] };
      }
    };
    try {
      var p = mc.registerTool(tool, { signal: controller.signal });
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  });
  addEventListener("pagehide", function () { controller.abort(); });
})();
`;

const MD = "text/markdown";
const JSON_CACHE = { "Cache-Control": "public, max-age=3600", ...cors };

export async function handleDiscovery(request: Request, env: Env, path: string): Promise<Response | null> {
  const url = new URL(request.url);
  const o = url.origin;
  switch (path) {
    case "/.well-known/api-catalog":
      return json(apiCatalog(o), 200, JSON_CACHE, "application/linkset+json");
    case "/.well-known/mcp/server-card.json":
    case "/.well-known/mcp.json":
      return json(serverCard(o), 200, JSON_CACHE);
    case "/.well-known/ai-catalog.json":
      return json(aiCatalog(o, url.hostname), 200, JSON_CACHE);
    case "/.well-known/agent-skills/index.json": {
      const body = skillMd(o);
      return json({
        $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
        skills: [{
          name: SKILL,
          type: "skill-md",
          description: "Help a U.S. homeowner with water damage, mold, fire or a flooded basement: safety, their county page, the local referral line and the right guide.",
          url: `/.well-known/agent-skills/${SKILL}/SKILL.md`,
          digest: `sha256:${await sha256Hex(body)}`,
        }],
      }, 200, JSON_CACHE);
    }
    case `/.well-known/agent-skills/${SKILL}/SKILL.md`:
      return text(skillMd(o), MD, JSON_CACHE);
    case "/.well-known/oauth-protected-resource":
      return json(protectedResource(o, o), 200, JSON_CACHE);
    case "/.well-known/oauth-protected-resource/mcp":
      return json(protectedResource(o, `${o}/mcp`), 200, JSON_CACHE);
    case "/.well-known/oauth-authorization-server":
      return json(authServer(o), 200, JSON_CACHE);
    case "/.well-known/jwks.json":
      return jwks(env);
    case "/auth.md":
      return text(authMd(o), MD, JSON_CACHE);
    case "/webmcp.js":
      return text(webmcpJs(), "text/javascript", { "Cache-Control": "public, max-age=3600" });
    case "/api/v1/health":
      return json({ status: "ok", time: new Date().toISOString() }, 200, { "Cache-Control": "no-store", ...cors });
  }
  return null;
}
